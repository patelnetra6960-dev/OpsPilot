import { Router } from 'express';
import {
  requireAuth,
  requireCustomer,
  enforceCustomerBoundary
} from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';
import validate from '../middleware/validateMiddleware.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';
import {
  customerServiceRequestSchema,
  customerFeedbackSchema,
  updateCustomerProfileSchema
} from '../validators/customer.validator.js';

const router = Router();

// Customer Portal routes require Auth, Tenant Context, Customer Role & Anti-IDOR Boundary
router.use(requireAuth);
router.use(requireTenant);
router.use(requireCustomer);
router.use(enforceCustomerBoundary);

/**
 * 1. Customer Portal Dashboard Overview
 */
router.get(
  '/portal',
  asyncHandler(async (req, res) => {
    const customerId = req.customer?.id;
    const organizationId = req.tenant.id;

    let customerRequests = [];
    let customerProjects = [];
    let customerInvoices = [];

    if (env.isMockMode || !supabaseAdmin) {
      customerRequests = (mockDatabase.serviceRequests || []).filter(
        (sr) =>
          sr.organization_id === organizationId && (!customerId || sr.customer_id === customerId)
      );
      customerProjects = (mockDatabase.projects || [])
        .filter(
          (p) =>
            p.organization_id === organizationId && (!customerId || p.customer_id === customerId)
        )
        .map((p) => ({
          id: p.id,
          project_code: p.project_code,
          name: p.name,
          description: p.description,
          status: p.status,
          health: p.health,
          progress: p.progress,
          target_date: p.target_date
        }));
      customerInvoices = (mockDatabase.invoices || []).filter(
        (inv) =>
          inv.organization_id === organizationId && (!customerId || inv.customer_id === customerId)
      );
    } else if (customerId) {
      const [reqRes, prjRes, invRes] = await Promise.all([
        supabaseAdmin
          .from('service_requests')
          .select('id, request_code, title, status, urgency, location, service_type, created_at')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('projects')
          .select('id, project_code, name, description, status, health, progress, target_date')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId),
        supabaseAdmin
          .from('invoices')
          .select('id, invoice_number, total, subtotal, tax, status, issue_date, due_date')
          .eq('organization_id', organizationId)
          .eq('customer_id', customerId)
          .order('issue_date', { ascending: false })
      ]);

      customerRequests = reqRes.data || [];
      customerProjects = prjRes.data || [];
      customerInvoices = invRes.data || [];
    }

    return sendSuccess(
      res,
      {
        customer: req.customer,
        organization: req.tenant,
        serviceRequests: customerRequests,
        projects: customerProjects,
        invoices: customerInvoices,
        stats: {
          totalRequests: customerRequests.length,
          activeRequests: customerRequests.filter((r) => r.status !== 'closed').length,
          activeProjects: customerProjects.filter((p) => p.status === 'in_progress').length,
          pendingInvoices: customerInvoices.filter((i) => i.status === 'pending').length
        }
      },
      'Customer portal data retrieved successfully'
    );
  })
);

/**
 * 2. Customer Profile Retrieval & Updates
 */
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    if (!req.customer) {
      return sendError(res, 'Customer profile not found for authenticated user', 404, 'NOT_FOUND');
    }
    return sendSuccess(
      res,
      {
        ...req.customer,
        organization: req.tenant
      },
      'Customer profile retrieved'
    );
  })
);

router.patch(
  '/profile',
  validate(updateCustomerProfileSchema),
  asyncHandler(async (req, res) => {
    if (!req.customer) {
      return sendError(res, 'Customer profile not found', 404, 'NOT_FOUND');
    }

    const { name, phone, address } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    updates.updated_at = new Date().toISOString();

    if (env.isMockMode || !supabaseAdmin) {
      Object.assign(req.customer, updates);
      return sendSuccess(res, req.customer, 'Profile updated successfully');
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(updates)
      .eq('id', req.customer.id)
      .eq('organization_id', req.tenant.id)
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, data, 'Profile updated successfully');
  })
);

/**
 * 3. Customer Service Requests: List & Create
 */
router.get(
  '/service-requests',
  asyncHandler(async (req, res) => {
    const customerId = req.customer?.id;
    const organizationId = req.tenant.id;
    const { status, urgency, search } = req.query;

    let list = [];
    if (env.isMockMode || !supabaseAdmin) {
      list = (mockDatabase.serviceRequests || []).filter(
        (sr) =>
          sr.organization_id === organizationId &&
          (!customerId || sr.customer_id === customerId) &&
          !sr.deleted_at
      );

      if (status && status !== 'all') {
        list = list.filter((sr) => sr.status === status);
      }
      if (urgency && urgency !== 'all') {
        list = list.filter((sr) => sr.urgency === urgency);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (sr) =>
            sr.title?.toLowerCase().includes(q) ||
            sr.request_code?.toLowerCase().includes(q) ||
            sr.description?.toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (customerId) {
      let query = supabaseAdmin
        .from('service_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') query = query.eq('status', status);
      if (urgency && urgency !== 'all') query = query.eq('urgency', urgency);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      list = data || [];
    }

    return sendSuccess(res, list, 'Customer service requests retrieved');
  })
);

router.post(
  '/service-requests',
  validate(customerServiceRequestSchema),
  asyncHandler(async (req, res) => {
    const customerId = req.customer?.id;
    if (!customerId) {
      return sendError(
        res,
        'Active customer account association required to log requests',
        400,
        'CUSTOMER_ID_REQUIRED'
      );
    }

    const { title, description, location, urgency = 'normal', service_type = 'repair' } = req.body;
    const requestCode = `SR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newRequest = {
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organization_id: req.tenant.id,
      customer_id: customerId,
      request_code: requestCode,
      title,
      description,
      location,
      urgency,
      service_type,
      status: 'new',
      step: 1,
      eta: 'Under Review by Dispatch',
      assigned_to: null,
      assigned_technician: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.serviceRequests) mockDatabase.serviceRequests = [];
      mockDatabase.serviceRequests.push(newRequest);
      return sendSuccess(res, newRequest, 'Service request submitted successfully', 201);
    }

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        organization_id: req.tenant.id,
        customer_id: customerId,
        request_code: requestCode,
        title,
        description,
        location,
        urgency,
        status: 'new'
      })
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, data, 'Service request submitted successfully', 201);
  })
);

/**
 * 4. Specific Service Request Detail with IDOR Protection & Tracking
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

    // Strict Anti-IDOR Check: Record MUST belong to authenticated customer
    if (req.customer && requestItem.customer_id !== req.customer.id && !req.user.is_superadmin) {
      return sendError(
        res,
        'Access Denied: You cannot view service requests belonging to other customers (IDOR Protection)',
        403,
        'FORBIDDEN_RESOURCE_ACCESS'
      );
    }

    // Determine current milestone step for UI tracking
    const stepMap = {
      new: 1,
      in_review: 2,
      assigned: 3,
      converted: 4,
      closed: 5
    };
    const currentStep = requestItem.step || stepMap[requestItem.status] || 1;

    const timeline = [
      {
        step: 1,
        name: 'Request Submitted',
        completed: currentStep >= 1,
        date: requestItem.created_at
      },
      { step: 2, name: 'Triage & Scope Review', completed: currentStep >= 2 },
      {
        step: 3,
        name: 'Technician Assigned',
        completed: currentStep >= 3,
        technician: requestItem.assigned_technician || 'Operations Dispatch'
      },
      {
        step: 4,
        name: 'Field Work In Progress',
        completed: currentStep >= 4,
        eta: requestItem.eta
      },
      { step: 5, name: 'Completed & Certified', completed: currentStep >= 5 }
    ];

    // Check if feedback already submitted
    let feedback = null;
    if (env.isMockMode || !supabaseAdmin) {
      feedback = (mockDatabase.customer_feedback || []).find((f) => f.service_request_id === id);
    } else {
      const { data: fbData } = await supabaseAdmin
        .from('customer_feedback')
        .select('*')
        .eq('service_request_id', id)
        .maybeSingle();
      feedback = fbData;
    }

    return sendSuccess(
      res,
      {
        ...requestItem,
        timeline,
        feedback
      },
      'Service request details retrieved'
    );
  })
);

/**
 * 5. Submit Feedback on Service Request
 */
router.post(
  '/service-requests/:id/feedback',
  validate(customerFeedbackSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating, comments } = req.body;
    const customerId = req.customer?.id;

    let requestItem = null;
    if (env.isMockMode || !supabaseAdmin) {
      requestItem = (mockDatabase.serviceRequests || []).find(
        (sr) => sr.id === id && sr.organization_id === req.tenant.id
      );
    } else {
      const { data } = await supabaseAdmin
        .from('service_requests')
        .select('id, customer_id')
        .eq('id', id)
        .eq('organization_id', req.tenant.id)
        .maybeSingle();
      requestItem = data;
    }

    if (!requestItem) {
      return sendError(res, 'Service request not found', 404, 'NOT_FOUND');
    }

    // Anti-IDOR Check
    if (req.customer && requestItem.customer_id !== customerId && !req.user.is_superadmin) {
      return sendError(
        res,
        'Access Denied: You cannot review service requests of other clients',
        403,
        'FORBIDDEN_RESOURCE_ACCESS'
      );
    }

    const feedbackRecord = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organization_id: req.tenant.id,
      customer_id: customerId,
      service_request_id: id,
      rating: Number(rating),
      comments: comments || '',
      created_at: new Date().toISOString()
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.customer_feedback) mockDatabase.customer_feedback = [];
      mockDatabase.customer_feedback.push(feedbackRecord);
      return sendSuccess(res, feedbackRecord, 'Feedback submitted successfully', 201);
    }

    const { data, error } = await supabaseAdmin
      .from('customer_feedback')
      .insert({
        organization_id: req.tenant.id,
        customer_id: customerId,
        service_request_id: id,
        rating: Number(rating),
        comments
      })
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, data, 'Feedback submitted successfully', 201);
  })
);

/**
 * 6. Permitted Project Updates
 */
router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const customerId = req.customer?.id;
    const organizationId = req.tenant.id;

    let projects = [];
    if (env.isMockMode || !supabaseAdmin) {
      projects = (mockDatabase.projects || []).filter(
        (p) => p.organization_id === organizationId && (!customerId || p.customer_id === customerId)
      );
    } else if (customerId) {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select(
          'id, project_code, name, description, status, health, progress, start_date, target_date'
        )
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId);

      if (error) throw error;
      projects = data || [];
    }

    // Safe customer projection (stripping internal budget margins and workforce hourly rates)
    const sanitizedProjects = projects.map((p) => ({
      id: p.id,
      project_code: p.project_code,
      name: p.name,
      description: p.description,
      status: p.status,
      health: p.health,
      progress: p.progress,
      start_date: p.start_date,
      target_date: p.target_date
    }));

    return sendSuccess(res, sanitizedProjects, 'Permitted project updates retrieved');
  })
);

/**
 * 7. Invoices List & Detail
 */
router.get(
  '/invoices',
  asyncHandler(async (req, res) => {
    const customerId = req.customer?.id;
    const organizationId = req.tenant.id;

    let invoices = [];
    if (env.isMockMode || !supabaseAdmin) {
      invoices = (mockDatabase.invoices || []).filter(
        (inv) =>
          inv.organization_id === organizationId && (!customerId || inv.customer_id === customerId)
      );
    } else if (customerId) {
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      invoices = data || [];
    }

    return sendSuccess(res, invoices, 'Customer invoices retrieved');
  })
);

router.get(
  '/invoices/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let invoice = null;

    if (env.isMockMode || !supabaseAdmin) {
      invoice = (mockDatabase.invoices || []).find(
        (inv) => inv.id === id && inv.organization_id === req.tenant.id
      );
    } else {
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .eq('id', id)
        .eq('organization_id', req.tenant.id)
        .maybeSingle();

      if (error) throw error;
      invoice = data;
    }

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404, 'NOT_FOUND');
    }

    // Strict Anti-IDOR Check: Record MUST belong to authenticated customer
    if (req.customer && invoice.customer_id !== req.customer.id && !req.user.is_superadmin) {
      return sendError(
        res,
        'Access Denied: You cannot view invoices belonging to other customers (IDOR Protection)',
        403,
        'FORBIDDEN_RESOURCE_ACCESS'
      );
    }

    return sendSuccess(res, invoice, 'Invoice retrieved successfully');
  })
);

export default router;
