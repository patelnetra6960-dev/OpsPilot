import attendanceService from '../services/attendance.service.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const attendanceController = {
  /**
   * Clock In
   */
  clockIn: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id;
    const result = await attendanceService.clockIn(tenantId, userId, req.body);
    return sendSuccess(res, result, 'Clock-in recorded successfully', 201);
  }),

  /**
   * Clock Out
   */
  clockOut: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id;
    const result = await attendanceService.clockOut(tenantId, userId, req.body);
    return sendSuccess(res, result, 'Clock-out recorded successfully', 200);
  }),

  /**
   * Get Timesheets / Attendance Records
   */
  getTimesheets: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const {
      page = 1,
      limit = 50,
      workforce_member_id,
      shift_id,
      status,
      start_date,
      end_date
    } = req.query;

    const result = await attendanceService.getTimesheets(tenantId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      workforce_member_id,
      shift_id,
      status,
      start_date,
      end_date
    });

    return sendPaginated(
      res,
      result.timesheets,
      result.pagination,
      'Timesheets retrieved successfully'
    );
  }),

  /**
   * Approve or Reject a Timesheet
   */
  approveTimesheet: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const approverUserId = req.user?.id;
    const result = await attendanceService.approveTimesheet(
      tenantId,
      approverUserId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, result, 'Timesheet status updated successfully');
  })
};

export default attendanceController;
