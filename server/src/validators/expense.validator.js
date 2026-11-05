import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'equipment_maintenance',
  'travel',
  'fuel',
  'meals_entertainment',
  'supplies',
  'lodging',
  'training',
  'other'
];

export const EXPENSE_STATUSES = ['pending', 'approved', 'rejected', 'reimbursed'];

export const createExpenseSchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().min(3, 'Description must be at least 3 characters').max(1000),
  amount: z.coerce.number().positive('Expense amount must be greater than zero'),
  claim_date: z.string().trim().optional(),
  work_order_id: z.string().trim().optional().nullable(),
  workforce_member_id: z.string().trim().optional(),
  receipt_url: z
    .string()
    .trim()
    .url('Receipt URL must be a valid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  receipt_attached: z.boolean().optional().default(false),
  claim_code: z.string().trim().optional()
});

export const updateExpenseSchema = z.object({
  category: z.string().trim().min(1).optional(),
  description: z.string().trim().min(3).max(1000).optional(),
  amount: z.coerce.number().positive('Expense amount must be greater than zero').optional(),
  claim_date: z.string().trim().optional(),
  work_order_id: z.string().trim().optional().nullable(),
  receipt_url: z
    .string()
    .trim()
    .url('Receipt URL must be a valid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  receipt_attached: z.boolean().optional()
});

export const approveExpenseSchema = z.object({
  notes: z.string().trim().max(1000).optional()
});

export const rejectExpenseSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason is mandatory and must be at least 3 characters')
    .max(1000)
});

export const reimburseExpenseSchema = z.object({
  notes: z.string().trim().max(1000).optional()
});

export const expenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['all', ...EXPENSE_STATUSES]).optional(),
  category: z.string().trim().optional(),
  workforce_member_id: z.string().trim().optional(),
  work_order_id: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional().default('claim_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});
