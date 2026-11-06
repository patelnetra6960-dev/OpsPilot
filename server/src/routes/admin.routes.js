import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import subscriptionController from '../controllers/subscription.controller.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  superAdminOverrideSchema,
  updatePlanSchema
} from '../validators/subscription.validator.js';

const router = Router();

// Platform Super Admin authorization guard on all routes
router.use(requireAuth);
router.use(requireSuperAdmin);

/**
 * Platform Super Admin Overview
 */
router.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    let orgCount = 0;
    let userCount = 0;

    if (env.isMockMode || !supabaseAdmin) {
      orgCount = (mockDatabase.organizations || []).length;
      userCount = (mockDatabase.users || []).length;
    } else {
      const { count: orgs } = await supabaseAdmin
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      const { count: users } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      orgCount = orgs || 0;
      userCount = users || 0;
    }

    return sendSuccess(
      res,
      {
        platform: 'OpsPilot SaaS Platform',
        superAdminAccess: 'granted',
        metrics: {
          totalOrganizations: orgCount,
          totalUsers: userCount
        }
      },
      'Super Admin platform overview retrieved'
    );
  })
);

/**
 * List all organizations cross-tenant (Super Admin only)
 */
router.get(
  '/organizations',
  asyncHandler(async (_req, res) => {
    if (env.isMockMode || !supabaseAdmin) {
      return sendSuccess(
        res,
        mockDatabase.organizations || [],
        'All platform organizations fetched'
      );
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, subscription_tier, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return sendSuccess(res, data || [], 'All platform organizations fetched');
  })
);

/**
 * Super Admin Subscription Management Controls
 */
router.get('/subscriptions', subscriptionController.getSuperAdminSubscriptions);
router.get('/subscriptions/metrics', subscriptionController.getSuperAdminMetrics);
router.get('/subscriptions/plans', subscriptionController.getPlans);

router.put(
  '/subscriptions/plans/:tier',
  validate(updatePlanSchema),
  subscriptionController.superAdminUpdatePlan
);

router.patch(
  '/subscriptions/organizations/:orgId/override',
  validate(superAdminOverrideSchema),
  subscriptionController.superAdminOverride
);

export default router;
