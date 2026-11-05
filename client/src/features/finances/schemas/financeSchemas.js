import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  { value: 'equipment_maintenance', label: 'Equipment Maintenance' },
  { value: 'travel', label: 'Travel & Lodging' },
  { value: 'fuel', label: 'Vehicle Fuel & Mileage' },
  { value: 'meals_entertainment', label: 'Meals & Per-Diem' },
  { value: 'supplies', label: 'Field Supplies & Consumables' },
  { value: 'lodging', label: 'Accommodation' },
  { value: 'training', label: 'Certification & Training' },
  { value: 'other', label: 'Other Operational Expenses' }
];

export const PAYMENT_METHODS = [
  { value: 'ach', label: 'ACH Bank Settlement' },
  { value: 'bank_transfer', label: 'Wire / Bank Transfer' },
  { value: 'check', label: 'Corporate Check' },
  { value: 'credit_card', label: 'Corporate Credit Card (External Terminal)' },
  { value: 'stripe', label: 'Online Payment Gateway' },
  { value: 'cash', label: 'Cash / Petty Cash' }
];

export const expenseSubmissionSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().trim().min(3, 'Description must be at least 3 characters').max(1000),
  amount: z.coerce.number().positive('Expense amount must be greater than zero'),
  claim_date: z.string().min(1, 'Claim date is required'),
  receipt_url: z
    .string()
    .trim()
    .url('Receipt URL must be a valid link')
    .optional()
    .nullable()
    .or(z.literal('')),
  work_order_id: z.string().trim().optional().nullable()
});

export const expenseRejectionSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(3, 'A mandatory rejection reason of at least 3 characters must be provided')
});

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative'),
  inventory_item_id: z.string().optional().nullable()
});

export const createInvoiceFormSchema = z.object({
  customer_id: z.string().min(1, 'Customer account is required'),
  due_date: z.string().min(1, 'Due date is required'),
  discount_amount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  tax_rate: z.coerce.number().min(0).max(100, 'Tax rate cannot exceed 100%').default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(invoiceLineItemSchema).min(1, 'At least one invoice line item is required')
});

export const recordPaymentFormSchema = z.object({
  payment_reference: z.string().trim().min(1, 'Payment reference / check # is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  payment_method: z.enum(['ach', 'bank_transfer', 'check', 'credit_card', 'cash', 'stripe']),
  paid_at: z.string().optional(),
  notes: z.string().trim().max(1000).optional().nullable()
});
