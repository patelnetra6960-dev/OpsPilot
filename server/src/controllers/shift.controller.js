import shiftService from '../services/shift.service.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const shiftController = {
  /**
   * Get shifts with search, filtering, and pagination
   */
  getShifts: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const {
      page = 1,
      limit = 50,
      workforce_member_id,
      start_date,
      end_date,
      status,
      department
    } = req.query;

    const result = await shiftService.getShifts(tenantId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      workforce_member_id,
      start_date,
      end_date,
      status,
      department
    });

    return sendPaginated(
      res,
      result.shifts,
      result.pagination,
      'Shift schedules retrieved successfully'
    );
  }),

  /**
   * Get single shift by ID
   */
  getShiftById: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const shift = await shiftService.getShiftById(tenantId, req.params.id);
    return sendSuccess(res, shift, 'Shift schedule details retrieved successfully');
  }),

  /**
   * Create a new shift schedule with overlap detection
   */
  createShift: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id;
    const created = await shiftService.createShift(tenantId, userId, req.body);
    return sendSuccess(res, created, 'Shift schedule created successfully', 201);
  }),

  /**
   * Update an existing shift schedule
   */
  updateShift: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id;
    const updated = await shiftService.updateShift(tenantId, userId, req.params.id, req.body);
    return sendSuccess(res, updated, 'Shift schedule updated successfully');
  }),

  /**
   * Cancel / soft delete a shift schedule
   */
  deleteShift: asyncHandler(async (req, res) => {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id;
    const result = await shiftService.deleteShift(tenantId, userId, req.params.id);
    return sendSuccess(res, result, 'Shift schedule cancelled successfully');
  })
};

export default shiftController;
