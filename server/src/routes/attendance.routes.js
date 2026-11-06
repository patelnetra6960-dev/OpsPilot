import { Router } from 'express';
import attendanceController from '../controllers/attendance.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  clockInSchema,
  clockOutSchema,
  timesheetApprovalSchema,
  attendanceQuerySchema
} from '../validators/attendance.validator.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

// Clock In (Mobile / Web)
router.post(
  '/clock-in',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(clockInSchema),
  attendanceController.clockIn
);

// Clock Out (Mobile / Web)
router.post(
  '/clock-out',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(clockOutSchema),
  attendanceController.clockOut
);

// List Timesheets
router.get(
  '/timesheets',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(attendanceQuerySchema, 'query'),
  attendanceController.getTimesheets
);

router.get(
  '/',
  requireTenantRole(['owner', 'admin', 'manager', 'employee', 'member']),
  validate(attendanceQuerySchema, 'query'),
  attendanceController.getTimesheets
);

// Approve / Reject Timesheet (Manager / Admin / Owner)
router.post(
  '/:id/approve',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(timesheetApprovalSchema),
  attendanceController.approveTimesheet
);

router.post(
  '/timesheets/:id/approve',
  requireTenantRole(['owner', 'admin', 'manager']),
  validate(timesheetApprovalSchema),
  attendanceController.approveTimesheet
);

export const attendanceRoutes = router;
export default router;
