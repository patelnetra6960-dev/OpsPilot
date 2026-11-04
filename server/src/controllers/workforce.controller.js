import workforceService from '../services/workforce.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const workforceController = {
  /**
   * Get workforce directory with tenant isolation
   */
  getDirectory: asyncHandler(async (req, res) => {
    const { department, status, search } = req.query;
    const members = await workforceService.getWorkforce(req.tenant.id, {
      department,
      status,
      search
    });
    return sendSuccess(res, members, 'Workforce directory retrieved successfully');
  }),

  /**
   * Create a new workforce member
   */
  createMember: asyncHandler(async (req, res) => {
    const newMember = await workforceService.createMember(req.tenant.id, req.body);
    return sendSuccess(res, newMember, 'Workforce member added successfully', 201);
  }),

  /**
   * Operational workforce statistics
   */
  getStats: asyncHandler(async (req, res) => {
    const stats = await workforceService.getOperationalStats(req.tenant.id);
    return sendSuccess(res, stats, 'Workforce operational statistics loaded');
  })
};

export default workforceController;
