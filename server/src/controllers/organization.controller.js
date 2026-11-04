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
  }),

  /**
   * Add / Invite Member to Organization
   */
  addMember: asyncHandler(async (req, res) => {
    const member = await organizationService.addMember({
      organizationId: req.tenant.id,
      userId: req.body.user_id,
      role: req.body.role || 'employee',
      requesterRole: req.membership.role
    });
    return sendSuccess(res, member, 'Member added to organization successfully', 201);
  }),

  /**
   * Update Member Role with Anti-Privilege Escalation
   */
  updateMemberRole: asyncHandler(async (req, res) => {
    const updated = await organizationService.updateMemberRole({
      organizationId: req.tenant.id,
      memberId: req.params.memberId,
      newRole: req.body.role,
      requesterRole: req.membership.role,
      requesterUserId: req.user.id
    });
    return sendSuccess(res, updated, 'Member role updated successfully');
  })
};

export default organizationController;
