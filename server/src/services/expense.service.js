import { expenseRepository } from '../repositories/expense.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';

export class ExpenseService {
  /**
   * Resolve workforce member ID for current user in organization
   */
  async getWorkforceMemberForUser(userId, organizationId) {
    if (!userId || !organizationId) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const members = mockDatabase.workforce || [];
      return (
        members.find(
          (m) =>
            m.organization_id === organizationId &&
            m.user_id === userId &&
            m.status !== 'terminated'
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from('workforce_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .neq('status', 'terminated')
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  /**
   * Helper to check if user has manager or admin rights
   */
  isManagerOrAbove(userRole) {
    return ['owner', 'admin', 'manager', 'superadmin'].includes(
      String(userRole || '').toLowerCase()
    );
  }

  /**
   * Generate sequential or timestamped unique claim code
   */
  async generateClaimCode(organizationId) {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const { data: allExpenses } = await expenseRepository.findMany(organizationId, { limit: 100 });
    const existingOrgCodes = (allExpenses || [])
      .map((e) => e.claim_code)
      .filter((code) => code && code.startsWith(prefix));

    let nextNumber = existingOrgCodes.length + 1;
    let candidate = `${prefix}${String(nextNumber).padStart(3, '0')}`;

    while (existingOrgCodes.includes(candidate)) {
      nextNumber += 1;
      candidate = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }

    return candidate;
  }

  /**
   * List expenses with tenant & role-level access control
   */
  async listExpenses(organizationId, query = {}, userContext = {}) {
    const { role, userId } = userContext;

    // Strict Customer Separation: External customer accounts are strictly forbidden from viewing internal employee expenses
    if (role === 'customer') {
      throw new ForbiddenError('Customer accounts are not authorized to view internal employee expenses');
    }

    const isManager = this.isManagerOrAbove(role);

    const queryFilters = { ...query };

    // Employee boundary: Non-managers can ONLY see their own expenses
    if (!isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      if (!staffMember) {
        return {
          data: [],
          pagination: {
            page: query.page || 1,
            limit: query.limit || 20,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }
      queryFilters.workforce_member_id = staffMember.id;
    }

    const result = await expenseRepository.findMany(organizationId, queryFilters);

    // Filter by date range in-memory if query parameters provided
    let items = result.data;
    if (query.from_date) {
      items = items.filter((e) => e.claim_date >= query.from_date);
    }
    if (query.to_date) {
      items = items.filter((e) => e.claim_date <= query.to_date);
    }

    return {
      data: items,
      pagination: result.pagination
    };
  }

  /**
   * Get single expense by ID
   */
  async getExpenseById(id, organizationId, userContext = {}) {
    const expense = await expenseRepository.findById(id, organizationId);
    if (!expense) throw new NotFoundError('Expense claim', id);

    const { role, userId } = userContext;
    const isManager = this.isManagerOrAbove(role);

    if (!isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      if (!staffMember || expense.workforce_member_id !== staffMember.id) {
        throw new ForbiddenError(
          'Access Denied: You are not authorized to view this expense claim'
        );
      }
    }

    // Attach approvals history
    const approvals = await expenseRepository.getExpenseApprovals(id, organizationId);
    return {
      ...expense,
      approvals
    };
  }

  /**
   * Submit new expense claim
   */
  async submitExpense(organizationId, expenseData, userContext = {}) {
    const { role, userId, userEmail, userName } = userContext;
    const isManager = this.isManagerOrAbove(role);

    let workforceMemberId = expenseData.workforce_member_id;
    let workforceMemberName = null;

    if (!workforceMemberId || !isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      if (staffMember) {
        workforceMemberId = staffMember.id;
        workforceMemberName = `${staffMember.first_name} ${staffMember.last_name}`.trim();
      } else if (!isManager) {
        throw new ForbiddenError('Only active workforce members can submit expense claims');
      }
    }

    if (!workforceMemberId) {
      workforceMemberId = userId;
      workforceMemberName = userName || userEmail;
    }

    const claimCode = expenseData.claim_code || (await this.generateClaimCode(organizationId));

    // Ensure unique claim code within org
    const existing = await expenseRepository.findByClaimCode(claimCode, organizationId);
    if (existing) {
      throw new ConflictError(
        `Expense claim code '${claimCode}' already exists in this organization`
      );
    }

    const payload = {
      claim_code: claimCode,
      user_id: userId,
      workforce_member_id: workforceMemberId,
      workforce_name: workforceMemberName,
      work_order_id: expenseData.work_order_id || null,
      claim_date: expenseData.claim_date || new Date().toISOString().split('T')[0],
      category: expenseData.category,
      description: expenseData.description,
      amount: Math.round(Number(expenseData.amount) * 100) / 100,
      receipt_url: expenseData.receipt_url || null,
      receipt_attached: Boolean(expenseData.receipt_attached || expenseData.receipt_url),
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null
    };

    const created = await expenseRepository.create(payload, organizationId);

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'EXPENSE_SUBMITTED',
      entityType: 'EXPENSE',
      entityId: created.id,
      metadata: { claimCode: created.claim_code, amount: created.amount }
    });

    return created;
  }

  /**
   * Update pending expense claim
   */
  async updateExpense(id, organizationId, updateData, userContext = {}) {
    const current = await expenseRepository.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense claim', id);

    const { role, userId } = userContext;
    const isManager = this.isManagerOrAbove(role);

    // Business rule: only pending claims can be modified
    if (current.status !== 'pending') {
      throw new ValidationError(
        `Cannot edit an expense that has already been ${current.status}. Please submit a new claim.`
      );
    }

    // Role check: non-managers can only edit their own claims
    if (!isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      if (!staffMember || current.workforce_member_id !== staffMember.id) {
        throw new ForbiddenError('You can only edit your own pending expense claims');
      }
    }

    const payload = { ...updateData };
    if (payload.amount !== undefined) {
      payload.amount = Math.round(Number(payload.amount) * 100) / 100;
    }
    if (payload.receipt_url) {
      payload.receipt_attached = true;
    }

    const updated = await expenseRepository.update(id, organizationId, payload);
    return updated;
  }

  /**
   * Approve expense claim (Manager / Admin only)
   */
  async approveExpense(id, organizationId, { notes }, userContext = {}) {
    const { role, userId, userName } = userContext;
    if (!this.isManagerOrAbove(role)) {
      throw new ForbiddenError('Manager or Admin permissions required to approve expenses');
    }

    const current = await expenseRepository.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense claim', id);

    if (current.status !== 'pending') {
      throw new ValidationError(
        `Cannot approve expense with status '${current.status}'. Only pending claims can be approved.`
      );
    }

    // Separation of duties: Cannot approve your own expense claim
    const approverStaff = await this.getWorkforceMemberForUser(userId, organizationId);
    if (approverStaff && approverStaff.id === current.workforce_member_id) {
      throw new ForbiddenError(
        'Separation of duties violation: You cannot approve your own expense claims'
      );
    }

    const approverName =
      userName ||
      (approverStaff ? `${approverStaff.first_name} ${approverStaff.last_name}` : 'Manager');

    const updated = await expenseRepository.approveExpense(
      id,
      organizationId,
      userId,
      approverName,
      notes
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'EXPENSE_APPROVED',
      entityType: 'EXPENSE',
      entityId: id,
      metadata: { claimCode: current.claim_code }
    });

    await notificationService.notifyExpenseReviewed({
      organizationId,
      expense: current,
      reviewerName: approverName,
      status: 'approved',
      reason: notes
    });

    return updated;
  }

  /**
   * Reject expense claim (Manager / Admin only)
   */
  async rejectExpense(id, organizationId, { rejection_reason }, userContext = {}) {
    const { role, userId, userName } = userContext;
    if (!this.isManagerOrAbove(role)) {
      throw new ForbiddenError('Manager or Admin permissions required to reject expenses');
    }

    if (!rejection_reason || rejection_reason.trim().length < 3) {
      throw new ValidationError(
        'A mandatory rejection reason of at least 3 characters must be provided'
      );
    }

    const current = await expenseRepository.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense claim', id);

    if (current.status !== 'pending') {
      throw new ValidationError(
        `Cannot reject expense with status '${current.status}'. Only pending claims can be rejected.`
      );
    }

    const approverStaff = await this.getWorkforceMemberForUser(userId, organizationId);
    const approverName =
      userName ||
      (approverStaff ? `${approverStaff.first_name} ${approverStaff.last_name}` : 'Manager');

    const updated = await expenseRepository.rejectExpense(
      id,
      organizationId,
      userId,
      approverName,
      rejection_reason.trim()
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'EXPENSE_REJECTED',
      entityType: 'EXPENSE',
      entityId: id,
      metadata: { claimCode: current.claim_code, reason: rejection_reason }
    });

    await notificationService.notifyExpenseReviewed({
      organizationId,
      expense: current,
      reviewerName: approverName,
      status: 'rejected',
      reason: rejection_reason
    });

    return updated;
  }

  /**
   * Reimburse approved expense claim
   */
  async reimburseExpense(id, organizationId, { notes }, userContext = {}) {
    const { role, userId } = userContext;
    if (!this.isManagerOrAbove(role)) {
      throw new ForbiddenError(
        'Manager or Admin permissions required to mark expenses as reimbursed'
      );
    }

    const current = await expenseRepository.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense claim', id);

    if (current.status !== 'approved') {
      throw new ValidationError(
        `Cannot reimburse expense with status '${current.status}'. Only approved claims can be marked reimbursed.`
      );
    }

    const updated = await expenseRepository.reimburseExpense(id, organizationId, notes);

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'EXPENSE_REIMBURSED',
      entityType: 'EXPENSE',
      entityId: id,
      metadata: { claimCode: current.claim_code }
    });

    return updated;
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(organizationId, userContext = {}) {
    const { role, userId } = userContext;
    const isManager = this.isManagerOrAbove(role);

    let workforceId = null;
    if (!isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      workforceId = staffMember ? staffMember.id : userId;
    }

    return await expenseRepository.getExpenseStats(organizationId, workforceId);
  }

  /**
   * Delete expense claim
   */
  async deleteExpense(id, organizationId, userContext = {}) {
    const current = await expenseRepository.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense claim', id);

    const { role, userId } = userContext;
    const isManager = this.isManagerOrAbove(role);

    if (!isManager) {
      const staffMember = await this.getWorkforceMemberForUser(userId, organizationId);
      if (!staffMember || current.workforce_member_id !== staffMember.id) {
        throw new ForbiddenError('You can only delete your own pending claims');
      }
      if (current.status !== 'pending') {
        throw new ValidationError('Only pending claims can be deleted');
      }
    }

    return await expenseRepository.delete(id, organizationId);
  }
}

export const expenseService = new ExpenseService();
