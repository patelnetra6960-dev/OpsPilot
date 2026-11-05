import BaseService from './base.service.js';
import serviceRequestRepository from '../repositories/serviceRequest.repository.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export const ALLOWED_SR_TRANSITIONS = {
  new: ['in_review', 'approved', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['converted'],
  rejected: ['new'],
  converted: ['closed'],
  closed: []
};

export class ServiceRequestService extends BaseService {
  constructor() {
    super(serviceRequestRepository, 'ServiceRequest');
  }

  /**
   * Validate status transition according to strict business state machine
   */
  assertValidTransition(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) return;

    const allowed = ALLOWED_SR_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid service request status transition: Cannot change from "${currentStatus}" to "${targetStatus}". Allowed target states: [${allowed.join(', ') || 'none (terminal state)'}]`
      );
    }
  }

  async beforeCreate(payload, organizationId, context = {}) {
    const requestCode = `SR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    let customerId = payload.customer_id;
    let customerName = null;

    // Resolve customer identity if user has customer role or customer association
    if (!customerId && context.user?.role === 'customer') {
      customerId = context.customer?.id || context.user.id;
    }

    if (customerId) {
      if (env.isMockMode || !supabaseAdmin) {
        const cust = (mockDatabase.customers || []).find(
          (c) => c.id === customerId && c.organization_id === organizationId
        );
        if (cust) customerName = cust.name;
      } else {
        const { data } = await supabaseAdmin
          .from('customers')
          .select('name')
          .eq('id', customerId)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (data) customerName = data.name;
      }
    }

    const initialHistory = [
      {
        id: `sh-init-${Date.now()}`,
        status: 'new',
        old_status: null,
        changed_by: context.user?.id || 'anonymous',
        changed_by_name: context.user?.full_name || customerName || 'Client Requestor',
        timestamp: new Date().toISOString(),
        notes: 'Service request created and queued for operations triage'
      }
    ];

    return {
      ...payload,
      request_code: payload.request_code || requestCode,
      customer_id: customerId || null,
      customer_name: customerName,
      status: 'new',
      status_history: initialHistory,
      attachments: payload.attachments || [],
      converted_work_order_id: null,
      manager_notes: null,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      approved_at: null,
      rejected_at: null
    };
  }

  async afterCreate(createdRecord, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_SUBMITTED',
      entityType: 'SERVICE_REQUEST',
      entityId: createdRecord.id,
      metadata: {
        requestCode: createdRecord.request_code,
        title: createdRecord.title,
        urgency: createdRecord.urgency
      }
    });

    // Notify operations managers of new inbound service request
    await notificationService.sendNotification({
      organizationId,
      userId: null, // Broadcast to managers
      title: 'New Service Request Logged',
      message: `${createdRecord.request_code} ("${createdRecord.title}") logged with urgency "${createdRecord.urgency}".`,
      type: 'dispatch',
      actionUrl: '/services'
    });

    return createdRecord;
  }

  /**
   * Manager moves service request to 'in_review'
   */
  async review(id, organizationId, { manager_notes = '' }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Service request '${id}' not found`);

    this.assertValidTransition(existing.status, 'in_review');

    const historyEntry = {
      status: 'in_review',
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Manager',
      notes: manager_notes || 'Triage review commenced'
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.updateStatus(id, organizationId, 'in_review', {
      manager_notes,
      reviewed_by: context.user?.id,
      reviewed_at: new Date().toISOString()
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_REVIEWED',
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      metadata: { manager_notes }
    });

    return updated;
  }

  /**
   * Manager approves service request
   */
  async approve(id, organizationId, { manager_notes = '' }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Service request '${id}' not found`);

    this.assertValidTransition(existing.status, 'approved');

    const historyEntry = {
      status: 'approved',
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Manager',
      notes: manager_notes || 'Approved for work order dispatch'
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.updateStatus(id, organizationId, 'approved', {
      manager_notes,
      reviewed_by: context.user?.id,
      approved_at: new Date().toISOString()
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_APPROVED',
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      metadata: { manager_notes }
    });

    // Notify customer
    await notificationService.sendNotification({
      organizationId,
      userId: existing.customer_id,
      title: 'Service Request Approved',
      message: `Your request ${existing.request_code} has been approved and queued for dispatch.`,
      type: 'success',
      actionUrl: '/customer/services'
    });

    return updated;
  }

  /**
   * Manager rejects service request
   */
  async reject(id, organizationId, { rejection_reason }, context = {}) {
    this.assertTenant(organizationId);
    if (!rejection_reason || rejection_reason.trim().length < 3) {
      throw new ValidationError('A detailed rejection reason is required');
    }

    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Service request '${id}' not found`);

    this.assertValidTransition(existing.status, 'rejected');

    const historyEntry = {
      status: 'rejected',
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Manager',
      notes: rejection_reason
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.updateStatus(id, organizationId, 'rejected', {
      rejection_reason,
      reviewed_by: context.user?.id,
      rejected_at: new Date().toISOString()
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_REJECTED',
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      metadata: { rejection_reason }
    });

    // Notify customer with rejection reason
    await notificationService.sendNotification({
      organizationId,
      userId: existing.customer_id,
      title: 'Service Request Rejected',
      message: `Your request ${existing.request_code} could not be approved. Reason: ${rejection_reason}`,
      type: 'warning',
      actionUrl: '/customer/services'
    });

    return updated;
  }

  /**
   * Add attachment to service request
   */
  async addAttachment(id, organizationId, attachmentData, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Service request '${id}' not found`);

    const attachment = await this.repository.addAttachment(id, organizationId, attachmentData);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_ATTACHMENT_ADDED',
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      metadata: { attachmentName: attachmentData.name }
    });

    return attachment;
  }

  /**
   * Convert an approved service request into a Work Order
   */
  async convertToWorkOrder(id, organizationId, workOrderPayload = {}, context = {}) {
    this.assertTenant(organizationId);
    const requestItem = await this.getById(id, organizationId, context);
    if (!requestItem) throw new NotFoundError(`Service request '${id}' not found`);

    if (requestItem.status !== 'approved') {
      throw new ValidationError(
        `Cannot generate work order: Request must be in 'approved' status first (Current status is '${requestItem.status}').`
      );
    }

    if (requestItem.converted_work_order_id) {
      throw new ValidationError(
        `Work order already generated for this request (${requestItem.converted_work_order_id})`
      );
    }

    // Lazy load workOrderService to avoid circular dependency
    const { workOrderService } = await import('./workOrder.service.js');

    const createdWorkOrder = await workOrderService.createFromServiceRequest(
      requestItem,
      organizationId,
      workOrderPayload,
      context
    );

    // Transition status to converted
    this.assertValidTransition(requestItem.status, 'converted');

    const historyEntry = {
      status: 'converted',
      old_status: 'approved',
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Dispatcher',
      notes: `Converted to Work Order ${createdWorkOrder.work_order_code}`
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.updateStatus(id, organizationId, 'converted', {
      converted_work_order_id: createdWorkOrder.id
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'SERVICE_REQUEST_CONVERTED',
      entityType: 'SERVICE_REQUEST',
      entityId: id,
      metadata: {
        requestCode: requestItem.request_code,
        workOrderId: createdWorkOrder.id,
        workOrderCode: createdWorkOrder.work_order_code
      }
    });

    return {
      serviceRequest: updated,
      workOrder: createdWorkOrder
    };
  }
}

export const serviceRequestService = new ServiceRequestService();
export default serviceRequestService;
