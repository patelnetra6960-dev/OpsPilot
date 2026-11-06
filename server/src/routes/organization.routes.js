import { Router } from 'express';
import organizationController from '../controllers/organization.controller.js';
import subscriptionController from '../controllers/subscription.controller.js';
import {
  requireAuth,
  requireTenantRole,
  protectPrivilegeEscalation
} from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateSettingsSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  updateMembershipStatusSchema,
  addMemberSchema,
  updateMemberRoleSchema
} from '../validators/organization.validator.js';
import {
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  cancelSubscriptionSchema
} from '../validators/subscription.validator.js';

const router = Router();

// Public Invitation Token Verification
router.get('/invitations/:token/verify', organizationController.verifyInvitation);

// All subsequent organization routes require authentication
router.use(requireAuth);

// Cross-tenant user-level discovery & creation
router.get('/my', organizationController.getMyOrganizations);
router.post('/', validate(createOrganizationSchema), organizationController.createOrganization);

// Accept invitation (User-scoped, joins organization)
router.post(
  '/invitations/:token/accept',
  validate(acceptInvitationSchema),
  organizationController.acceptInvitation
);

// Tenant-scoped endpoints (Enforces X-Tenant-Id header and active membership)
router.get('/current', requireTenant, organizationController.getCurrentOrganization);
router.patch(
  '/current',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(updateOrganizationSchema),
  organizationController.updateCurrentOrganization
);

// Organization Settings Management
router.get('/current/settings', requireTenant, organizationController.getSettings);
router.patch(
  '/current/settings',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(updateSettingsSchema),
  organizationController.updateSettings
);

// Organization Subscription & Usage Management
router.get('/current/subscription', requireTenant, subscriptionController.getCurrentSubscription);
router.get('/current/subscription/plans', subscriptionController.getPlans);
router.post(
  '/current/subscription/upgrade',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(upgradeSubscriptionSchema),
  subscriptionController.upgrade
);
router.post(
  '/current/subscription/downgrade',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(downgradeSubscriptionSchema),
  subscriptionController.downgrade
);
router.post(
  '/current/subscription/cancel',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(cancelSubscriptionSchema),
  subscriptionController.cancel
);
router.post(
  '/current/subscription/reactivate',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  subscriptionController.reactivate
);

// Member management
router.get('/members', requireTenant, organizationController.getMembers);
router.post(
  '/members',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  protectPrivilegeEscalation,
  validate(addMemberSchema),
  organizationController.addMember
);
router.patch(
  '/members/:memberId',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  protectPrivilegeEscalation,
  validate(updateMemberRoleSchema),
  organizationController.updateMemberRole
);
router.patch(
  '/members/:memberId/status',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(updateMembershipStatusSchema),
  organizationController.updateMembershipStatus
);

// Membership Invitations Management
router.get(
  '/invitations',
  requireTenant,
  requireTenantRole(['owner', 'admin', 'manager']),
  organizationController.getInvitations
);
router.post(
  '/invitations',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  validate(createInvitationSchema),
  organizationController.createInvitation
);
router.delete(
  '/invitations/:invitationId',
  requireTenant,
  requireTenantRole(['owner', 'admin']),
  organizationController.revokeInvitation
);

export default router;
