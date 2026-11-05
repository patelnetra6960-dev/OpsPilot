import { z } from 'zod';
import { createBusinessValidator, paginationQuerySchema, idParamSchema } from './base.validator.js';

export const assetCategoryEnum = z.enum([
  'vehicle',
  'heavy_machinery',
  'diagnostic_tool',
  'equipment',
  'facility'
]);

export const assetStatusEnum = z.enum([
  'available',
  'assigned',
  'maintenance',
  'retired',
  'damaged'
]);

export const assetCreateSchema = z.object({
  asset_tag: z
    .string({ required_error: 'Asset tag is required' })
    .trim()
    .min(2, 'Asset tag must be at least 2 characters')
    .max(100),
  name: z
    .string({ required_error: 'Asset name is required' })
    .trim()
    .min(2, 'Asset name must be at least 2 characters')
    .max(255),
  category: assetCategoryEnum.default('equipment'),
  status: assetStatusEnum.default('available'),
  assigned_to: z.string().trim().nullable().optional(),
  supplier_id: z.string().trim().nullable().optional(),
  serial_number: z.string().trim().max(100).optional().default(''),
  purchase_date: z.string().trim().optional(),
  purchase_cost: z.coerce
    .number({ invalid_type_error: 'Purchase cost must be a number' })
    .min(0, 'Purchase cost cannot be negative')
    .default(0),
  location: z.string().trim().max(255).optional().default('Main Facility'),
  department: z.string().trim().max(100).optional().default('Operations'),
  metadata: z.record(z.unknown()).optional().default({})
});

export const assetUpdateSchema = assetCreateSchema.partial().extend({
  asset_tag: z.string().trim().min(2).max(100).optional()
});

export const assetAssignSchema = z.object({
  assigned_to: z
    .string({ required_error: 'Assignee workforce member ID is required' })
    .trim()
    .min(1),
  department: z.string().trim().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional()
});

export const assetStatusChangeSchema = z.object({
  status: assetStatusEnum,
  reason: z.string().trim().max(500).optional().default('')
});

export const assetMaintenanceSchema = z.object({
  date: z.string({ required_error: 'Service date is required' }).trim().min(1),
  type: z.enum(['scheduled', 'repair', 'calibration', 'inspection']).default('scheduled'),
  description: z
    .string({ required_error: 'Maintenance description is required' })
    .trim()
    .min(3, 'Description must be at least 3 characters')
    .max(1000),
  cost: z.coerce.number().min(0, 'Service cost cannot be negative').default(0),
  performed_by: z.string().trim().max(255).optional().default('Service Technician'),
  next_service_due: z.string().trim().optional()
});

export const assetQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().optional(),
  status: z.string().trim().optional(),
  assigned_to: z.string().trim().optional()
});

const baseSuite = createBusinessValidator({
  createSchema: assetCreateSchema,
  updateSchema: assetUpdateSchema,
  customQuerySchema: assetQuerySchema
});

export const assetValidator = {
  ...baseSuite,
  assign: assetAssignSchema,
  statusChange: assetStatusChangeSchema,
  maintenance: assetMaintenanceSchema,
  params: idParamSchema
};

export default assetValidator;
