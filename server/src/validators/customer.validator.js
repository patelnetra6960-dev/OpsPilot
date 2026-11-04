import { z } from 'zod';
import { createBusinessValidator } from './base.validator.js';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(150),
  company_name: z.string().trim().max(150).optional().nullable(),
  email: z.string().trim().email('Invalid customer email address'),
  phone: z.string().trim().max(30).optional().nullable(),
  customer_code: z.string().trim().max(50).optional(),
  sla_tier: z
    .enum(['standard', 'silver', 'gold', 'platinum', 'critical', 'premium'])
    .default('standard'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional()
    })
    .optional()
    .nullable()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQueryFilterSchema = z.object({
  sla_tier: z.string().trim().optional()
});

export const customerValidator = createBusinessValidator({
  createSchema: createCustomerSchema,
  updateSchema: updateCustomerSchema,
  customQuerySchema: customerQueryFilterSchema
});

export default customerValidator;
