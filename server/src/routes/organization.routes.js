import { Router } from 'express';
import organizationController from '../controllers/organization.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createOrganizationSchema } from '../validators/organization.validator.js';

const router = Router();

// All organization routes require authentication
router.use(requireAuth);

// Cross-tenant user-level discovery
router.get('/my', organizationController.getMyOrganizations);
router.post('/', validate(createOrganizationSchema), organizationController.createOrganization);

// Tenant-scoped endpoints (Enforces X-Tenant-Id header and active membership)
router.get('/current', requireTenant, organizationController.getCurrentOrganization);
router.get('/members', requireTenant, organizationController.getMembers);

export default router;
