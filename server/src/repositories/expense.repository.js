import { BaseRepository } from './base.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';

export class ExpenseRepository extends BaseRepository {
  constructor() {
    super('expenses', {
      mockKey: 'expenses',
      searchFields: ['claim_code', 'description', 'category', 'workforce_name'],
      allowedFilterFields: ['category', 'status', 'workforce_member_id', 'work_order_id'],
      allowedSortFields: ['claim_date', 'amount', 'created_at', 'status', 'claim_code']
    });
  }

  /**
   * Find expense claim by unique code within tenant
   */
  async findByClaimCode(claimCode, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const claims = mockDatabase.expenses || [];
      return (
        claims.find(
          (c) =>
            c.organization_id === organizationId &&
            c.claim_code.toLowerCase() === claimCode.trim().toLowerCase() &&
            !c.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('claim_code', claimCode.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Record Manager Approval
   */
  async approveExpense(id, organizationId, approverId, approverName, notes = '') {
    this.assertTenantContext(organizationId);

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'approved',
      reviewed_by: approverId,
      reviewed_at: now,
      review_notes: notes || 'Expense claim approved by manager',
      updated_at: now
    };

    const updated = await this.update(id, organizationId, updatePayload);

    // Record audit trail in expense_approvals
    const approvalRecord = {
      id: `exp-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organization_id: organizationId,
      expense_id: id,
      approver_id: approverId,
      approver_name: approverName || 'Manager',
      decision: 'approved',
      notes: notes || 'Expense claim approved',
      decided_at: now
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.expense_approvals) mockDatabase.expense_approvals = [];
      mockDatabase.expense_approvals.unshift(approvalRecord);
    } else {
      await supabaseAdmin.from('expense_approvals').insert(approvalRecord);
    }

    return updated;
  }

  /**
   * Record Manager Rejection
   */
  async rejectExpense(id, organizationId, approverId, approverName, rejectionReason) {
    this.assertTenantContext(organizationId);

    const now = new Date().toISOString();
    const updatePayload = {
      status: 'rejected',
      reviewed_by: approverId,
      reviewed_at: now,
      review_notes: rejectionReason,
      updated_at: now
    };

    const updated = await this.update(id, organizationId, updatePayload);

    // Record audit trail in expense_approvals
    const approvalRecord = {
      id: `exp-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organization_id: organizationId,
      expense_id: id,
      approver_id: approverId,
      approver_name: approverName || 'Manager',
      decision: 'rejected',
      notes: rejectionReason,
      decided_at: now
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.expense_approvals) mockDatabase.expense_approvals = [];
      mockDatabase.expense_approvals.unshift(approvalRecord);
    } else {
      await supabaseAdmin.from('expense_approvals').insert(approvalRecord);
    }

    return updated;
  }

  /**
   * Mark expense as reimbursed
   */
  async reimburseExpense(id, organizationId, notes = '') {
    this.assertTenantContext(organizationId);

    const current = await this.findById(id, organizationId);
    if (!current) throw new NotFoundError('Expense', id);

    const now = new Date().toISOString();
    const newNotes = notes
      ? current.review_notes
        ? `${current.review_notes} | Reimbursed: ${notes}`
        : `Reimbursed: ${notes}`
      : current.review_notes;

    return await this.update(id, organizationId, {
      status: 'reimbursed',
      review_notes: newNotes,
      updated_at: now
    });
  }

  /**
   * Retrieve approval audit history for an expense
   */
  async getExpenseApprovals(expenseId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const records = mockDatabase.expense_approvals || [];
      return records
        .filter((a) => a.organization_id === organizationId && a.expense_id === expenseId)
        .sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at));
    }

    const { data, error } = await supabaseAdmin
      .from('expense_approvals')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('expense_id', expenseId)
      .order('decided_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate aggregated expense statistics
   */
  async getExpenseStats(organizationId, workforceMemberId = null) {
    this.assertTenantContext(organizationId);

    let records = [];
    if (env.isMockMode || !supabaseAdmin) {
      records = (mockDatabase.expenses || []).filter(
        (e) =>
          e.organization_id === organizationId &&
          !e.deleted_at &&
          (!workforceMemberId || e.workforce_member_id === workforceMemberId)
      );
    } else {
      let query = supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (workforceMemberId) {
        query = query.eq('workforce_member_id', workforceMemberId);
      }
      const { data, error } = await query;
      if (error) throw error;
      records = data || [];
    }

    const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

    const stats = {
      total_count: records.length,
      total_amount: round2(records.reduce((acc, r) => acc + Number(r.amount || 0), 0)),
      pending_count: records.filter((r) => r.status === 'pending').length,
      pending_amount: round2(
        records
          .filter((r) => r.status === 'pending')
          .reduce((acc, r) => acc + Number(r.amount || 0), 0)
      ),
      approved_count: records.filter((r) => r.status === 'approved').length,
      approved_amount: round2(
        records
          .filter((r) => r.status === 'approved')
          .reduce((acc, r) => acc + Number(r.amount || 0), 0)
      ),
      reimbursed_count: records.filter((r) => r.status === 'reimbursed').length,
      reimbursed_amount: round2(
        records
          .filter((r) => r.status === 'reimbursed')
          .reduce((acc, r) => acc + Number(r.amount || 0), 0)
      ),
      rejected_count: records.filter((r) => r.status === 'rejected').length
    };

    return stats;
  }
}

export const expenseRepository = new ExpenseRepository();
