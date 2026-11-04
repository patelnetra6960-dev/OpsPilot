import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import { sendError } from '../utils/responseHandler.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Multi-Tenant Isolation Middleware
 * Enforces strict organization-level isolation at the backend application layer.
 * Blocks any attempt to access data from an organization the user does not belong to.
 */
export const requireTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication context missing before tenant resolution', 401, 'UNAUTHORIZED');
    }

    // Extract tenant ID from header, query, or path parameter
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.params.tenantId;

    if (!tenantId) {
      return sendError(
        res,
        'Organization context required: please provide X-Tenant-Id header',
        400,
        'TENANT_HEADER_REQUIRED'
      );
    }

    // Handle Mock / Local dev mode
    if (env.isMockMode) {
      const organization = mockDatabase.organizations.find(
        (org) => (org.id === tenantId || org.slug === tenantId) && org.is_active
      );

      if (!organization) {
        return sendError(res, `Organization '${tenantId}' not found or inactive`, 404, 'TENANT_NOT_FOUND');
      }

      // Check membership
      const membership = mockDatabase.memberships.find(
        (m) => m.organization_id === organization.id && m.user_id === req.user.id && m.status === 'active'
      );

      if (!membership && !req.user.is_superadmin) {
        logger.warn(`Cross-tenant breach prevented: User ${req.user.id} attempted to access Org ${organization.id}`);
        return sendError(
          res,
          'Access Denied: You do not have active membership in this organization',
          403,
          'FORBIDDEN_CROSS_TENANT_ACCESS'
        );
      }

      req.tenant = organization;
      req.membership = membership || { role: 'superadmin', status: 'active' };
      return next();
    }

    // Production Supabase Tenant & Membership Verification
    if (!supabaseAdmin) {
      return sendError(res, 'Database service unavailable for tenant verification', 503, 'SERVICE_UNAVAILABLE');
    }

    // 1. Verify organization exists and is active
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, subscription_tier, is_active, settings')
      .eq('id', tenantId)
      .single();

    if (orgError || !organization || !organization.is_active) {
      return sendError(res, 'Organization not found or inactive', 404, 'TENANT_NOT_FOUND');
    }

    // 2. Verify active membership for the authenticated user
    const { data: membership, error: memError } = await supabaseAdmin
      .from('organization_members')
      .select('id, role, status')
      .eq('organization_id', organization.id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if ((memError || !membership) && !req.user.is_superadmin) {
      logger.warn(`Cross-tenant breach prevented: User ${req.user.id} tried accessing tenant ${organization.id}`);
      return sendError(
        res,
        'Access Denied: You do not have active membership in this organization',
        403,
        'FORBIDDEN_CROSS_TENANT_ACCESS'
      );
    }

    // Attach validated tenant context to request
    req.tenant = organization;
    req.membership = membership || { role: 'superadmin', status: 'active' };

    next();
  } catch (error) {
    logger.error('Error resolving tenant context', error);
    return sendError(res, 'Tenant resolution error', 500, 'TENANT_ERROR', error.message);
  }
};

/**
 * Granular RBAC Middleware inside the validated Tenant
 * Ensures user has one of the allowed roles ('owner', 'admin', 'manager', 'member')
 */
export const requireTenantRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.membership) {
      return sendError(res, 'Tenant membership context not loaded', 500, 'MEMBERSHIP_CONTEXT_MISSING');
    }

    if (req.user?.is_superadmin) {
      return next();
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return sendError(
        res,
        `Forbidden: Action requires one of roles [${allowedRoles.join(', ')}]. Current role: ${req.membership.role}`,
        403,
        'INSUFFICIENT_ROLE_PERMISSIONS'
      );
    }

    next();
  };
};
