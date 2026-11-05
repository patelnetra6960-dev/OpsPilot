import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller.js';
import { requireAuth, requireManagerOrAdmin } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  reimburseExpenseSchema,
  expenseQuerySchema
} from '../validators/expense.validator.js';

const router = Router();

// Tenant boundary & Authentication required for all expense endpoints
router.use(requireAuth);
router.use(requireTenant);

// 1. Analytics & Statistics
router.get('/stats', expenseController.getExpenseStats);

// 2. Collection Operations
router.get('/', validate(expenseQuerySchema, 'query'), expenseController.listExpenses);
router.post('/', validate(createExpenseSchema), expenseController.submitExpense);

// 3. Entity Operations
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

// 4. Approval & Reimbursement Lifecycle (Manager / Admin Only)
router.post(
  '/:id/approve',
  requireManagerOrAdmin,
  validate(approveExpenseSchema),
  expenseController.approveExpense
);
router.post(
  '/:id/reject',
  requireManagerOrAdmin,
  validate(rejectExpenseSchema),
  expenseController.rejectExpense
);
router.post(
  '/:id/reimburse',
  requireManagerOrAdmin,
  validate(reimburseExpenseSchema),
  expenseController.reimburseExpense
);
router.get('/:id/history', expenseController.getExpenseHistory);

export default router;
