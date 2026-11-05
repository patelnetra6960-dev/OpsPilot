import { z } from 'zod';
import { createBusinessValidator, paginationQuerySchema, idParamSchema } from './base.validator.js';

export const inventoryItemCreateSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(100),
  name: z
    .string({ required_error: 'Item name is required' })
    .trim()
    .min(2, 'Item name must be at least 2 characters')
    .max(255),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(2, 'Category is required')
    .max(100),
  location: z.string().trim().max(255).optional().default('Warehouse Central'),
  supplier_id: z.string().trim().nullable().optional(),
  in_stock: z.coerce
    .number({ invalid_type_error: 'Stock must be a valid number' })
    .int('Stock quantity must be an integer')
    .min(0, 'Initial stock quantity cannot be negative')
    .default(0),
  reorder_level: z.coerce
    .number({ invalid_type_error: 'Reorder level must be a valid number' })
    .int('Reorder level must be an integer')
    .min(0, 'Minimum stock threshold cannot be negative')
    .default(5),
  unit_cost: z.coerce
    .number({ invalid_type_error: 'Unit cost must be a valid number' })
    .min(0, 'Unit cost cannot be negative')
    .default(0)
});

export const inventoryItemUpdateSchema = inventoryItemCreateSchema.partial().extend({
  sku: z.string().trim().min(2).max(100).optional()
});

export const stockInSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Stock-in quantity must be a whole integer')
    .min(1, 'Stock-in quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative').optional(),
  supplier_id: z.string().trim().nullable().optional(),
  reference_type: z
    .enum(['purchase_order', 'return', 'manual', 'initial', 'transfer'])
    .default('manual'),
  reference_id: z.string().trim().nullable().optional(),
  reference_note: z.string().trim().max(500).optional().default(''),
  idempotency_key: z.string().trim().optional(),
  expected_version: z.coerce.number().int().optional()
});

export const stockOutSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Stock-out quantity must be a whole integer')
    .min(1, 'Stock-out quantity must be at least 1'),
  reference_type: z
    .enum(['work_order', 'scrap', 'manual', 'customer', 'transfer'])
    .default('manual'),
  reference_id: z.string().trim().nullable().optional(),
  reference_note: z.string().trim().max(500).optional().default(''),
  idempotency_key: z.string().trim().optional(),
  expected_version: z.coerce.number().int().optional()
});

export const stockAdjustSchema = z.object({
  adjustment_type: z.enum(['delta', 'set_absolute']).default('set_absolute'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Adjustment quantity must be a number' })
    .int('Adjustment quantity must be an integer'),
  reason: z
    .string({ required_error: 'Adjustment reason is required' })
    .trim()
    .min(3, 'Adjustment reason must be at least 3 characters')
    .max(500),
  idempotency_key: z.string().trim().optional(),
  expected_version: z.coerce.number().int().optional()
});

export const inventoryQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().optional(),
  status: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional(),
  low_stock: z.coerce.boolean().optional(),
  supplier_id: z.string().trim().optional()
});

const baseSuite = createBusinessValidator({
  createSchema: inventoryItemCreateSchema,
  updateSchema: inventoryItemUpdateSchema,
  customQuerySchema: inventoryQuerySchema
});

export const inventoryValidator = {
  ...baseSuite,
  stockIn: stockInSchema,
  stockOut: stockOutSchema,
  adjust: stockAdjustSchema,
  params: idParamSchema
};

export default inventoryValidator;
