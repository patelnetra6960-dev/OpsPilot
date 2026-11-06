import { z } from 'zod';

export const upgradeSubscriptionSchema = z.object({
  targetTier: z.enum(['starter', 'growth', 'enterprise'], {
    errorMap: () => ({ message: "targetTier must be one of: 'starter', 'growth', 'enterprise'" })
  }),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  simulatedPaymentMethod: z.string().optional().default('simulated_card'),
  notes: z.string().max(500).optional()
});

export const downgradeSubscriptionSchema = z.object({
  targetTier: z.enum(['starter', 'growth', 'enterprise'], {
    errorMap: () => ({ message: "targetTier must be one of: 'starter', 'growth', 'enterprise'" })
  }),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  reason: z.string().max(500).optional()
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
  feedback: z.string().max(1000).optional()
});

export const superAdminOverrideSchema = z.object({
  tier: z.enum(['starter', 'growth', 'enterprise']).optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'paused']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  extendTrialDays: z.number().int().min(1).max(365).optional(),
  customLimits: z
    .object({
      max_members: z.number().int().min(1).optional(),
      max_projects: z.number().int().min(1).optional(),
      max_tasks: z.number().int().min(1).optional(),
      storage_gb: z.number().min(1).optional()
    })
    .optional(),
  notes: z.string().max(500).optional()
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price_monthly: z.number().min(0).optional(),
  price_yearly: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  trial_days: z.number().int().min(0).max(365).optional(),
  is_active: z.boolean().optional(),
  limits: z
    .object({
      max_members: z.number().int().min(1).optional(),
      max_projects: z.number().int().min(1).optional(),
      max_tasks: z.number().int().min(1).optional(),
      storage_gb: z.number().min(1).optional(),
      custom_branding: z.boolean().optional(),
      priority_support: z.boolean().optional(),
      automated_workflows: z.boolean().optional(),
      geofencing: z.boolean().optional()
    })
    .optional(),
  features: z.array(z.string()).optional()
});

export default {
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  cancelSubscriptionSchema,
  superAdminOverrideSchema,
  updatePlanSchema
};
