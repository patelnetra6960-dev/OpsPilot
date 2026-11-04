import { Router } from 'express';
import workforceController from '../controllers/workforce.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createWorkforceSchema,
  updateWorkforceSchema,
  assignDepartmentSchema,
  assignManagerSchema,
  updateEmployeeRoleSchema,
  workforceQuerySchema
} from '../validators/workforce.validator.js';

const router = Router();

// Every workforce route requires authentication AND verified tenant isolation context
router.use(requireAuth);
router.use(requireTenant);

// Directory list with pagination, search, and filtering
router.get(
  '/',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(workforceQuerySchema, 'query'),
  workforceController.getDirectory
);

// Operational workforce statistics
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

// View employee details
router.get(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  workforceController.getMemberById
);

// Update employee details
router.patch(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(updateWorkforceSchema),
  workforceController.updateMember
);

// Assign department
router.patch(
  '/:id/department',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(assignDepartmentSchema),
  workforceController.assignDepartment
);

// Assign manager
router.patch(
  '/:id/manager',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(assignManagerSchema),
  workforceController.assignManager
);

// Change permitted roles (Admin or Owner only)
router.patch(
  '/:id/role',
  requireTenantRole(['owner', 'admin']),
  validate(updateEmployeeRoleSchema),
  workforceController.changeRole
);

// Deactivate employee
router.delete(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager']),
  workforceController.deactivateMember
);

router.patch(
  '/:id/deactivate',
  requireTenantRole(['owner', 'admin', 'manager']),
  workforceController.deactivateMember
);

export default router;
