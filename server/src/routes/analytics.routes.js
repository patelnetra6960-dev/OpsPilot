import { Router } from 'express';
import { requireAuth, requireSuperAdmin, requireManagerOrAdmin } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { analyticsQuerySchema, analyticsExportQuerySchema } from '../validators/analytics.validator.js';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

// 1. Organization Executive Dashboard (Tenant scoped)
router.get(
  '/organization',
  requireAuth,
  requireTenant,
  validate(analyticsQuerySchema, 'query'),
  analyticsController.getOrganizationDashboard
);

// 2. Manager Productivity, Workload & Overdue Dashboard (Manager+ role scoped)
router.get(
  '/manager',
  requireAuth,
  requireTenant,
  requireManagerOrAdmin,
  validate(analyticsQuerySchema, 'query'),
  analyticsController.getManagerDashboard
);

// 3. Super Admin Platform Analytics (Super Admin only, cross-tenant)
router.get(
  '/platform',
  requireAuth,
  requireSuperAdmin,
  validate(analyticsQuerySchema, 'query'),
  analyticsController.getSuperAdminDashboard
);

// 4. Exportable Reports (CSV)
router.get(
  '/export',
  requireAuth,
  (req, res, next) => {
    // If exporting platform report, require superadmin; otherwise require tenant
    if (req.query.type === 'platform') {
      return requireSuperAdmin(req, res, next);
    }
    return requireTenant(req, res, next);
  },
  validate(analyticsExportQuerySchema, 'query'),
  analyticsController.exportAnalyticsReport
);

export default router;
