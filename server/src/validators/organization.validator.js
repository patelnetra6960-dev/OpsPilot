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

export const brandingSchema = z.object({
  logo_url: z.string().nullable().optional(),
  primary_color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color').optional(),
  accent_color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color').optional(),
  website: z.string().url().or(z.literal('')).optional(),
  contact_email: z.string().email().or(z.literal('')).optional(),
  contact_phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional()
    })
    .optional()
});

export const preferencesSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().length(3).optional(),
  date_format: z.string().optional(),
  fiscal_year_start: z.number().int().min(1).max(12).optional(),
  business_hours: z.record(z.any()).optional()
});

export const notificationPreferencesSchema = z.object({
  email_alerts: z.boolean().optional(),
  sms_alerts: z.boolean().optional(),
  push_alerts: z.boolean().optional(),
  webhook_url: z.string().url().nullable().or(z.literal('')).optional(),
  events: z
    .object({
      shift_reminders: z.boolean().optional(),
      dispatch_alerts: z.boolean().optional(),
      overdue_tasks: z.boolean().optional(),
      invoice_due: z.boolean().optional(),
      expense_approvals: z.boolean().optional(),
      audit_security: z.boolean().optional()
    })
    .optional()
});

export const updateSettingsSchema = z.object({
  // Direct top-level fields (backward compatibility)
  timezone: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().length(3).optional(),
  date_format: z.string().optional(),
  businessHours: z.record(z.any()).optional(),
  notificationPreferences: z.record(z.any()).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  customSettings: z.record(z.any()).optional(),

  // Structured enterprise sections
  branding: brandingSchema.optional(),
  preferences: preferencesSchema.optional(),
  notifications: notificationPreferencesSchema.optional(),
  subscription: z.record(z.any()).optional()
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
  brandingSchema,
  preferencesSchema,
  notificationPreferencesSchema,
  updateSettingsSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  updateMembershipStatusSchema,
  addMemberSchema,
  updateMemberRoleSchema
};
