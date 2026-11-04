import { Router } from 'express';
import workforceController from '../controllers/workforce.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createWorkforceSchema } from '../validators/workforce.validator.js';

const router = Router();

// Every workforce route requires authentication AND verified tenant isolation context
router.use(requireAuth);
router.use(requireTenant);

// Directory list & operational stats (restricted to internal workforce & staff, customers excluded)
router.get(
  '/',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  workforceController.getDirectory
);
router.get(
  '/stats',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  workforceController.getStats
);

// Creating a workforce member requires Manager or higher role
router.post(
  '/',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(createWorkforceSchema),
  workforceController.createMember
);

export default router;
