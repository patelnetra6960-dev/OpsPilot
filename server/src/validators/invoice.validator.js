import { z } from 'zod';

export const INVOICE_STATUSES = ['draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled'];
export const PAYMENT_METHODS = ['credit_card', 'ach', 'bank_transfer', 'check', 'cash', 'stripe'];

export const invoiceItemSchema = z.object({
  inventory_item_id: z.string().trim().optional().nullable(),
  description: z.string().trim().min(1, 'Line item description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative')
});

export const createInvoiceSchema = z.object({
  customer_id: z.string().trim().min(1, 'Customer ID is required'),
  invoice_number: z.string().trim().optional(),
  work_order_id: z.string().trim().optional().nullable(),
  issue_date: z.string().trim().optional(),
  due_date: z.string().trim().min(1, 'Due date is required'),
  discount_amount: z.coerce.number().min(0, 'Discount cannot be negative').optional().default(0),
  tax_rate: z.coerce
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .optional()
    .default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required')
});

export const updateInvoiceSchema = z.object({
  customer_id: z.string().trim().min(1).optional(),
  work_order_id: z.string().trim().optional().nullable(),
  issue_date: z.string().trim().optional(),
  due_date: z.string().trim().optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['draft', 'pending', 'cancelled']).optional(),
  items: z.array(invoiceItemSchema).min(1).optional()
});

const FORBIDDEN_CARD_FIELDS = [
  'card_number',
  'cardNumber',
  'pan',
  'cvv',
  'cvc',
  'cvv2',
  'cvc2',
  'expiration_date',
  'exp_date',
  'expiry',
  'cardholder_name',
  'security_code'
];

export const recordPaymentSchema = z
  .object({
    payment_reference: z.string().trim().min(1, 'Payment reference is required'),
    amount: z.coerce.number().positive('Payment amount must be greater than zero'),
    payment_method: z.enum(['credit_card', 'ach', 'bank_transfer', 'check', 'cash', 'stripe']),
    paid_at: z.string().trim().optional(),
    notes: z.string().trim().max(1000).optional().nullable()
  })
  .passthrough()
  .superRefine((val, ctx) => {
    // Strict PCI-DSS: Disallow direct card details submission
    for (const key of Object.keys(val)) {
      if (
        FORBIDDEN_CARD_FIELDS.includes(key.toLowerCase()) ||
        /credit.*card|pan|cvv|cvc|card.*num/i.test(key)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Security violation: Payment card details (PAN, CVV, card numbers) must not be submitted or stored directly (PCI-DSS compliance rule)',
          path: [key]
        });
      }
    }
  });

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['all', ...INVOICE_STATUSES]).optional(),
  customer_id: z.string().trim().optional(),
  work_order_id: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional().default('issue_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});
