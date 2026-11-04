import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import auditController from '../controllers/audit.controller.js';
import { auditQuerySchema } from '../validators/audit.validator.js';

const router = Router();

// Global Guards: Authentication and verified active tenant isolation
router.use(requireAuth);
router.use(requireTenant);

// Audit logs are strictly restricted to Organization Owners and Administrators
router.get(
  '/',
  requireTenantRole(['owner', 'admin']),
  validate(auditQuerySchema, 'query'),
  auditController.listAuditLogs
);

// Immutability Guard: Reject any mutation attempts
router.post('*', auditController.rejectAuditMutation);
router.put('*', auditController.rejectAuditMutation);
router.patch('*', auditController.rejectAuditMutation);
router.delete('*', auditController.rejectAuditMutation);

export default router;
