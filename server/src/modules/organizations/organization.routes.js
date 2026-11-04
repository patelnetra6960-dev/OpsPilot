import { Router } from 'express';
import organizationController from './organization.controller.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../../middleware/tenantMiddleware.js';

const router = Router();

// All organization routes require authentication
router.use(requireAuth);

// User-level organization endpoints (Cross-tenant discovery for the authenticated user)
router.get('/my', organizationController.getMyOrganizations);
router.post('/', organizationController.createOrganization);

// Tenant-scoped endpoints (Enforces X-Tenant-Id header and membership)
router.get('/current', requireTenant, organizationController.getCurrentOrganization);
router.get('/members', requireTenant, organizationController.getMembers);

export default router;
