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
    const details = await organizationService.getOrganizationDetails(req.tenant.id);
    return sendSuccess(
      res,
      {
        organization: details,
        membership: req.membership
      },
      'Current organization details fetched'
    );
  }),

  /**
   * Update organization general info
   */
  updateCurrentOrganization: asyncHandler(async (req, res) => {
    const updated = await organizationService.updateOrganization(req.tenant.id, req.body);
    return sendSuccess(res, updated, 'Organization updated successfully');
  }),

  /**
   * Get organization settings
   */
  getSettings: asyncHandler(async (req, res) => {
    const org = await organizationService.getById(req.tenant.id);
    return sendSuccess(res, org?.settings || {}, 'Organization settings retrieved');
  }),

  /**
   * Update organization settings
   */
  updateSettings: asyncHandler(async (req, res) => {
    const updated = await organizationService.updateSettings(req.tenant.id, req.body);
    return sendSuccess(res, updated, 'Organization settings updated successfully');
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
  }),

  /**
   * Activate or Deactivate (Suspend) Member
   */
  updateMembershipStatus: asyncHandler(async (req, res) => {
    const updated = await organizationService.updateMembershipStatus({
      organizationId: req.tenant.id,
      memberId: req.params.memberId,
      status: req.body.status,
      requesterRole: req.membership.role,
      requesterUserId: req.user.id
    });
    return sendSuccess(res, updated, `Membership status updated to '${req.body.status}'`);
  }),

  /**
   * List Organization Invitations
   */
  getInvitations: asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query;
    const result = await organizationService.getInvitations(req.tenant.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status
    });
    return sendSuccess(res, result.data, 'Invitations retrieved successfully', 200, {
      pagination: result.pagination
    });
  }),

  /**
   * Create and Dispatch Invitation
   */
  createInvitation: asyncHandler(async (req, res) => {
    const invitation = await organizationService.createInvitation({
      organizationId: req.tenant.id,
      email: req.body.email,
      role: req.body.role,
      departmentId: req.body.department_id,
      invitedBy: req.user.id
    });
    return sendSuccess(res, invitation, 'Invitation created and dispatched successfully', 201);
  }),

  /**
   * Revoke Invitation
   */
  revokeInvitation: asyncHandler(async (req, res) => {
    const revoked = await organizationService.revokeInvitation({
      organizationId: req.tenant.id,
      invitationId: req.params.invitationId
    });
    return sendSuccess(res, revoked, 'Invitation revoked successfully');
  }),

  /**
   * Verify Invitation Token
   */
  verifyInvitation: asyncHandler(async (req, res) => {
    const result = await organizationService.verifyInvitation(req.params.token);
    return sendSuccess(res, result, 'Invitation token verified successfully');
  }),

  /**
   * Accept Invitation (Transactional)
   */
  acceptInvitation: asyncHandler(async (req, res) => {
    const result = await organizationService.acceptInvitation({
      token: req.params.token,
      userId: req.user.id,
      fullName: req.body.full_name || req.user.full_name
    });
    return sendSuccess(res, result, 'Invitation accepted successfully. Organization joined.');
  })
};

export default organizationController;
