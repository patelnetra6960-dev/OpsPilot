import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  subscription_tier: z.enum(['starter', 'growth', 'enterprise']).optional(),
  settings: z.record(z.any()).optional()
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  settings: z.record(z.any()).optional(),
  is_active: z.boolean().optional()
});

export default {
  createOrganizationSchema,
  updateOrganizationSchema
};
