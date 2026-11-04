import { Router } from 'express';
import {
  requireAuth,
  requireCustomer,
  enforceCustomerBoundary
} from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

const router = Router();

// Customer Portal routes require Auth, Tenant Context, and Customer Role
router.use(requireAuth);
router.use(requireTenant);
router.use(requireCustomer);
router.use(enforceCustomerBoundary);

/**
 * Customer Portal Dashboard Overview
 */
router.get(
  '/portal',
  asyncHandler(async (req, res) => {
    let customerRequests = [];

    if (env.isMockMode || !supabaseAdmin) {
      const allRequests = mockDatabase.serviceRequests || [];
      customerRequests = allRequests.filter(
        (sr) =>
          sr.organization_id === req.tenant.id &&
          (!req.customer || sr.customer_id === req.customer.id)
      );
    } else if (req.customer) {
      const { data } = await supabaseAdmin
        .from('service_requests')
        .select('id, request_code, title, status, urgency, created_at')
        .eq('organization_id', req.tenant.id)
        .eq('customer_id', req.customer.id);
      customerRequests = data || [];
    }

    return sendSuccess(
      res,
      {
        customer: req.customer,
        organization: req.tenant,
        serviceRequests: customerRequests
      },
      'Customer portal data retrieved'
    );
  })
);

/**
 * Customer Specific Service Request Detail with IDOR Protection
 */
router.get(
  '/service-requests/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let requestItem = null;

    if (env.isMockMode || !supabaseAdmin) {
      requestItem = (mockDatabase.serviceRequests || []).find(
        (sr) => sr.id === id && sr.organization_id === req.tenant.id
      );
    } else {
      const { data } = await supabaseAdmin
        .from('service_requests')
        .select('*')
        .eq('id', id)
        .eq('organization_id', req.tenant.id)
        .maybeSingle();
      requestItem = data;
    }

    if (!requestItem) {
      return sendError(res, 'Service request not found', 404, 'NOT_FOUND');
    }

    // Strict IDOR Check: Ensure record belongs to this verified customer
    if (req.customer && requestItem.customer_id !== req.customer.id && !req.user.is_superadmin) {
      return sendError(
        res,
        'Access Denied: You cannot view service requests belonging to other customers (IDOR Protection)',
        403,
        'FORBIDDEN_RESOURCE_ACCESS'
      );
    }

    return sendSuccess(res, requestItem, 'Service request retrieved');
  })
);

export default router;
