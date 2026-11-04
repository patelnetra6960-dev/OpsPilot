import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  slug: z
    .string()
    .min(1, 'Organization slug is required')
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  subscription_tier: z.enum(['starter', 'professional', 'enterprise']).default('starter')
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  role: z.enum(['admin', 'manager', 'employee', 'customer'], {
    errorMap: () => ({ message: 'Please select a valid membership role' })
  })
});
