import workforceService from '../services/workforce.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const workforceController = {
  /**
   * Get workforce directory with search, filtering, pagination, and sorting
   */
  getDirectory: asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      department,
      department_id,
      status,
      employment_type,
      manager_id,
      search,
      sortBy,
      sortOrder
    } = req.query;

    const result = await workforceService.getWorkforce(req.tenant.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      department,
      department_id,
      status,
      employment_type,
      manager_id,
      search,
      sortBy,
      sortOrder
    });

    return sendSuccess(res, result.data, 'Workforce directory retrieved successfully', 200, {
      pagination: result.pagination
    });
  }),

  /**
   * Get individual employee details by ID
   */
  getMemberById: asyncHandler(async (req, res) => {
    const member = await workforceService.getMemberById(req.tenant.id, req.params.id);
    return sendSuccess(res, member, 'Employee details retrieved successfully');
  }),

  /**
   * Create a new workforce member
   */
  createMember: asyncHandler(async (req, res) => {
    const newMember = await workforceService.createMember(
      req.tenant.id,
      req.body,
      req.membership.role
    );
    return sendSuccess(res, newMember, 'Workforce member added successfully', 201);
  }),

  /**
   * Update employee details
   */
  updateMember: asyncHandler(async (req, res) => {
    const updated = await workforceService.updateMember(req.tenant.id, req.params.id, req.body);
    return sendSuccess(res, updated, 'Employee profile updated successfully');
  }),

  /**
   * Assign department to employee
   */
  assignDepartment: asyncHandler(async (req, res) => {
    const updated = await workforceService.assignDepartment(req.tenant.id, req.params.id, req.body);
    return sendSuccess(res, updated, 'Department assigned successfully');
  }),

  /**
   * Assign manager to employee
   */
  assignManager: asyncHandler(async (req, res) => {
    const updated = await workforceService.assignManager(req.tenant.id, req.params.id, req.body);
    return sendSuccess(res, updated, 'Manager assigned successfully');
  }),

  /**
   * Change permitted role for employee
   */
  changeRole: asyncHandler(async (req, res) => {
    const result = await workforceService.changeRole(req.tenant.id, req.params.id, {
      role: req.body.role,
      requesterRole: req.membership.role,
      requesterUserId: req.user.id
    });
    return sendSuccess(res, result, `Permitted role updated to '${req.body.role}'`);
  }),

  /**
   * Deactivate employee
   */
  deactivateMember: asyncHandler(async (req, res) => {
    const result = await workforceService.deactivateMember(
      req.tenant.id,
      req.params.id,
      req.membership.role
    );
    return sendSuccess(res, result, 'Employee deactivated and memberships suspended');
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
