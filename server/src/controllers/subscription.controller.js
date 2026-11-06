import subscriptionService from '../services/subscription.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const subscriptionController = {
  /**
   * Get Active Subscription Plans Catalog (Public/Authenticated)
   */
  getPlans: asyncHandler(async (_req, res) => {
    const plans = await subscriptionService.getPlans();
    return sendSuccess(res, plans, 'Subscription plans retrieved successfully');
  }),

  /**
   * Get Current Tenant Organization Subscription & Usage
   */
  getCurrentSubscription: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!orgId) {
      return sendError(res, 'Tenant context required', 400, 'TENANT_REQUIRED');
    }

    const subscription = await subscriptionService.getOrganizationSubscription(orgId);
    return sendSuccess(res, subscription, 'Organization subscription retrieved');
  }),

  /**
   * Get Resource Usage & Limits
   */
  getUsage: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    const usage = await subscriptionService.getOrganizationUsage(orgId);
    return sendSuccess(res, usage, 'Organization resource usage retrieved');
  }),

  /**
   * Upgrade Plan (Simulated Billing MVP)
   */
  upgrade: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    const userId = req.user.id;
    const result = await subscriptionService.upgradeSubscription(orgId, req.body, userId);
    return sendSuccess(res, result, result.message, 200);
  }),

  /**
   * Downgrade Plan (With Safety Check)
   */
  downgrade: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    const userId = req.user.id;
    const result = await subscriptionService.downgradeSubscription(orgId, req.body, userId);
    return sendSuccess(res, result, result.message, 200);
  }),

  /**
   * Cancel Subscription (Cancel at period end)
   */
  cancel: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    const userId = req.user.id;
    const result = await subscriptionService.cancelSubscription(orgId, req.body, userId);
    return sendSuccess(res, result, result.message, 200);
  }),

  /**
   * Reactivate Subscription
   */
  reactivate: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    const userId = req.user.id;
    const result = await subscriptionService.reactivateSubscription(orgId, userId);
    return sendSuccess(res, result, result.message, 200);
  }),

  /**
   * Super Admin: List All Subscriptions
   */
  getSuperAdminSubscriptions: asyncHandler(async (req, res) => {
    const { page, limit, status, search } = req.query;
    const result = await subscriptionService.getAllSubscriptions({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      status,
      search
    });
    return sendSuccess(res, result.data, 'All platform subscriptions retrieved', 200, result.pagination);
  }),

  /**
   * Super Admin: Platform Subscription Metrics
   */
  getSuperAdminMetrics: asyncHandler(async (_req, res) => {
    const metrics = await subscriptionService.getPlatformMetrics();
    return sendSuccess(res, metrics, 'Platform subscription metrics retrieved');
  }),

  /**
   * Super Admin: Override an Organization Subscription
   */
  superAdminOverride: asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const adminUserId = req.user.id;
    const result = await subscriptionService.superAdminOverride(orgId, req.body, adminUserId);
    return sendSuccess(res, result, result.message);
  }),

  /**
   * Super Admin: Update Plan Definition
   */
  superAdminUpdatePlan: asyncHandler(async (req, res) => {
    const { tier } = req.params;
    const adminUserId = req.user.id;
    const updatedPlan = await subscriptionService.updatePlanDefinition(tier, req.body, adminUserId);
    return sendSuccess(res, updatedPlan, `Plan '${tier}' updated successfully`);
  })
};

export default subscriptionController;
