import { Router } from 'express';
import workforceController from './workforce.controller.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../../middleware/tenantMiddleware.js';

const router = Router();

// Every workforce route requires authentication AND verified tenant isolation context
router.use(requireAuth);
router.use(requireTenant);

// Directory list & operational stats
router.get('/', workforceController.getDirectory);
router.get('/stats', workforceController.getStats);

// Creating a workforce member requires Manager or higher role
router.post(
  '/',
  requireTenantRole(['owner', 'admin', 'manager']),
  workforceController.createMember
);

export default router;
