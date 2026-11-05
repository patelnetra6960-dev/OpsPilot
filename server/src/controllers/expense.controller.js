import { expenseService } from '../services/expense.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class ExpenseController {
  /**
   * Helper to build user context from request
   */
  getUserContext(req) {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.full_name || req.user?.name,
      role: req.membership?.role || req.userRole || req.user?.role || 'employee'
    };
  }

  /**
   * List paginated expenses
   */
  listExpenses = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await expenseService.listExpenses(organizationId, req.query, userContext);
    return sendSuccess(res, result.data, 'Expenses retrieved successfully', 200, result.pagination);
  });

  /**
   * Get single expense claim
   */
  getExpenseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const expense = await expenseService.getExpenseById(id, organizationId, userContext);
    return sendSuccess(res, expense, 'Expense claim retrieved successfully');
  });

  /**
   * Submit expense claim
   */
  submitExpense = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const created = await expenseService.submitExpense(organizationId, req.body, userContext);
    return sendSuccess(res, created, 'Expense claim submitted for review', 201);
  });

  /**
   * Update pending expense claim
   */
  updateExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const updated = await expenseService.updateExpense(id, organizationId, req.body, userContext);
    return sendSuccess(res, updated, 'Expense claim updated successfully');
  });

  /**
   * Approve expense claim (Manager / Admin)
   */
  approveExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const updated = await expenseService.approveExpense(id, organizationId, req.body, userContext);
    return sendSuccess(res, updated, 'Expense claim approved successfully');
  });

  /**
   * Reject expense claim (Manager / Admin)
   */
  rejectExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const updated = await expenseService.rejectExpense(id, organizationId, req.body, userContext);
    return sendSuccess(res, updated, 'Expense claim rejected');
  });

  /**
   * Mark expense as reimbursed
   */
  reimburseExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const updated = await expenseService.reimburseExpense(
      id,
      organizationId,
      req.body,
      userContext
    );
    return sendSuccess(res, updated, 'Expense claim marked as reimbursed');
  });

  /**
   * Get aggregated expense stats
   */
  getExpenseStats = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const stats = await expenseService.getExpenseStats(organizationId, userContext);
    return sendSuccess(res, stats, 'Expense statistics retrieved successfully');
  });

  /**
   * Get approval audit history for an expense
   */
  getExpenseHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const expense = await expenseService.getExpenseById(id, organizationId, userContext);
    return sendSuccess(
      res,
      expense.approvals || [],
      'Expense approval history retrieved successfully'
    );
  });

  /**
   * Delete expense claim
   */
  deleteExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const deleted = await expenseService.deleteExpense(id, organizationId, userContext);
    return sendSuccess(res, deleted, 'Expense claim deleted successfully');
  });
}

export const expenseController = new ExpenseController();
