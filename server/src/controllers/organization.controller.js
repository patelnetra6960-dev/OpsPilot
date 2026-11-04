import organizationService from '../services/organization.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const organizationController = {
  /**
   * List all organizations for the currently authenticated user
   */
  getMyOrganizations: asyncHandler(async (req, res) => {
    const organizations = await organizationService.getUserOrganizations(req.user.id);
    return sendSuccess(res, organizations, 'User organizations fetched successfully');
  }),

  /**
   * Create a new organization
   */
  createOrganization: asyncHandler(async (req, res) => {
    const organization = await organizationService.createOrganization(req.body, req.user.id);
    return sendSuccess(res, organization, 'Organization created successfully', 201);
  }),

  /**
   * Get current active organization details
   */
  getCurrentOrganization: asyncHandler(async (req, res) => {
    return sendSuccess(
      res,
      {
        organization: req.tenant,
        membership: req.membership
      },
      'Current organization details fetched'
    );
  }),

  /**
   * List members of the current active organization
   */
  getMembers: asyncHandler(async (req, res) => {
    const members = await organizationService.getOrganizationMembers(req.tenant.id);
    return sendSuccess(res, members, 'Organization members fetched');
  })
};

export default organizationController;
