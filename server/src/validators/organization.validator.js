import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).optional(),
  subscription_tier: z.enum(['starter', 'growth', 'enterprise']).optional(),
  settings: z.record(z.any()).optional()
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  slug: z.string().min(2).optional(),
  settings: z.record(z.any()).optional(),
  is_active: z.boolean().optional()
});

export const updateSettingsSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  businessHours: z.record(z.any()).optional(),
  notificationPreferences: z.record(z.any()).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  customSettings: z.record(z.any()).optional()
});

export const createInvitationSchema = z.object({
  email: z.string().email('Valid invitation email address is required'),
  role: z.enum(['admin', 'manager', 'employee', 'customer', 'member']).default('employee'),
  department_id: z.string().optional().nullable()
});

export const acceptInvitationSchema = z.object({
  full_name: z.string().min(2).optional()
});

export const updateMembershipStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'invited'])
});

export const addMemberSchema = z.object({
  user_id: z.string().min(1, 'Valid user ID is required'),
  role: z.enum(['admin', 'manager', 'employee', 'customer', 'member']).default('employee')
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'employee', 'customer', 'member'])
});

export default {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateSettingsSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  updateMembershipStatusSchema,
  addMemberSchema,
  updateMemberRoleSchema
};
