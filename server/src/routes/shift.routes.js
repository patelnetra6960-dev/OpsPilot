import { Router } from 'express';
import shiftController from '../controllers/shift.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createShiftSchema,
  updateShiftSchema,
  shiftQuerySchema
} from '../validators/shift.validator.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

// List shifts with filters
router.get(
  '/',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(shiftQuerySchema, 'query'),
  shiftController.getShifts
);

// Single shift details
router.get(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  shiftController.getShiftById
);

// Create shift (Manager / Admin / Owner)
router.post(
  '/',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(createShiftSchema),
  shiftController.createShift
);

// Update shift (Manager / Admin / Owner)
router.put(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(updateShiftSchema),
  shiftController.updateShift
);

router.patch(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(updateShiftSchema),
  shiftController.updateShift
);

// Delete / Cancel shift (Manager / Admin / Owner)
router.delete(
  '/:id',
  requireTenantRole(['owner', 'admin', 'manager']),
  shiftController.deleteShift
);

export const shiftRoutes = router;
export default router;
