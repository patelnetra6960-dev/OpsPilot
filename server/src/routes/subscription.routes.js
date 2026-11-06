import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller.js';
import { requireAuth, requireTenantRole } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  cancelSubscriptionSchema
} from '../validators/subscription.validator.js';

const router = Router();

// Public / Authenticated Plan Catalog
router.get('/plans', subscriptionController.getPlans);

// Tenant-Scoped Subscription Operations
router.get('/current', requireAuth, requireTenant, subscriptionController.getCurrentSubscription);
router.get('/usage', requireAuth, requireTenant, subscriptionController.getUsage);

// Organization Admin / Owner Operations
router.post(
  '/upgrade',
  requireAuth,
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(upgradeSubscriptionSchema),
  subscriptionController.upgrade
);

router.post(
  '/downgrade',
  requireAuth,
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(downgradeSubscriptionSchema),
  subscriptionController.downgrade
);

router.post(
  '/cancel',
  requireAuth,
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(cancelSubscriptionSchema),
  subscriptionController.cancel
);

router.post(
  '/reactivate',
  requireAuth,
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  subscriptionController.reactivate
);

export default router;
