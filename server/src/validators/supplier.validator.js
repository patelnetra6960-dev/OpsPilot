import { z } from 'zod';
import { createBusinessValidator, paginationQuerySchema, idParamSchema } from './base.validator.js';

export const supplierCreateSchema = z.object({
  name: z
    .string({ required_error: 'Supplier name is required' })
    .trim()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(255),
  code: z
    .string({ required_error: 'Supplier code is required' })
    .trim()
    .min(2, 'Supplier code must be at least 2 characters')
    .max(50),
  contact_name: z.string().trim().max(255).optional().default(''),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  payment_terms: z.string().trim().max(100).optional().default('Net 30'),
  category: z.string().trim().max(100).optional().default('General Parts'),
  status: z.enum(['active', 'inactive', 'preferred']).default('active')
});

export const supplierUpdateSchema = supplierCreateSchema.partial().extend({
  code: z.string().trim().min(2).max(50).optional()
});

export const purchaseItemSchema = z.object({
  item_id: z.string().trim().nullable().optional(),
  sku: z.string().trim().min(1, 'Part SKU is required'),
  name: z.string().trim().min(1, 'Item name is required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative').default(0)
});

export const purchaseOrderCreateSchema = z.object({
  po_number: z.string().trim().optional(),
  order_date: z.string().trim().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one purchase order item is required'),
  notes: z.string().trim().max(500).optional().default('')
});

export const supplierQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().optional(),
  status: z.string().trim().optional()
});

const baseSuite = createBusinessValidator({
  createSchema: supplierCreateSchema,
  updateSchema: supplierUpdateSchema,
  customQuerySchema: supplierQuerySchema
});

export const supplierValidator = {
  ...baseSuite,
  createPurchase: purchaseOrderCreateSchema,
  params: idParamSchema
};

export default supplierValidator;
