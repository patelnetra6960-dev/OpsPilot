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
  status: z.enum(['active', 'inactive', 'suspended', 'lead']).default('active'),
  lead_status: z.enum(['lead', 'prospect', 'active', 'churned']).default('active'),
  follow_up_date: z.string().trim().optional().nullable(),
  follow_up_notes: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  address: z
    .union([
      z.string(),
      z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional()
      })
    ])
    .optional()
    .nullable()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addCustomerNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note content is required').max(5000)
});

export const updateFollowUpSchema = z.object({
  lead_status: z.enum(['lead', 'prospect', 'active', 'churned']).optional(),
  follow_up_date: z.string().trim().optional().nullable(),
  follow_up_notes: z.string().trim().optional().nullable()
});

export const customerServiceRequestSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
  location: z.string().trim().min(2, 'Facility location is required').max(255),
  urgency: z.enum(['critical', 'urgent', 'high', 'normal', 'low']).default('normal'),
  service_type: z.string().trim().default('repair')
});

export const customerFeedbackSchema = z.object({
  rating: z.coerce
    .number()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comments: z.string().trim().max(2000).optional().nullable()
});

export const updateCustomerProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z
    .union([
      z.string(),
      z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional()
      })
    ])
    .optional()
    .nullable()
});

export const customerQueryFilterSchema = z.object({
  sla_tier: z.string().trim().optional(),
  status: z.string().trim().optional(),
  lead_status: z.string().trim().optional()
});

export const customerValidator = createBusinessValidator({
  createSchema: createCustomerSchema,
  updateSchema: updateCustomerSchema,
  customQuerySchema: customerQueryFilterSchema
});

export default customerValidator;
