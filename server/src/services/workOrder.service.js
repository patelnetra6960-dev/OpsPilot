import BaseService from './base.service.js';
import workOrderRepository from '../repositories/workOrder.repository.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export const ALLOWED_WO_TRANSITIONS = {
  draft: ['scheduled', 'dispatched', 'in_progress', 'cancelled'],
  scheduled: ['dispatched', 'in_progress', 'cancelled'],
  dispatched: ['in_progress', 'cancelled'],
  in_progress: ['review', 'completed', 'cancelled'],
  review: ['completed', 'in_progress'],
  completed: ['closed'],
  closed: [],
  cancelled: []
};

export class WorkOrderService extends BaseService {
  constructor() {
    super(workOrderRepository, 'WorkOrder');
  }

  /**
   * Validate state machine status transition
   */
  assertValidTransition(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) return;

    const allowed = ALLOWED_WO_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid work order status transition: Cannot change from "${currentStatus}" to "${targetStatus}". Allowed target states: [${allowed.join(', ') || 'none (terminal state)'}]`
      );
    }
  }

  /**
   * Resolve technician full name from workforce repository or database
   */
  async resolveTechnicianName(workforceId, organizationId) {
    if (!workforceId) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const member = (mockDatabase.workforce || []).find(
        (w) => w.id === workforceId && w.organization_id === organizationId
      );
      if (member) return `${member.first_name} ${member.last_name}`.trim();
      return 'Dispatched Technician';
    }

    const { data } = await supabaseAdmin
      .from('workforce_members')
      .select('first_name, last_name')
      .eq('id', workforceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (data) return `${data.first_name} ${data.last_name}`.trim();
    return 'Dispatched Technician';
  }

  async beforeCreate(payload, organizationId, context = {}) {
    const workOrderCode = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let techName = payload.assigned_technician;
    if (!techName && payload.assigned_to) {
      techName = await this.resolveTechnicianName(payload.assigned_to, organizationId);
    }

    const initialStatus = payload.status || (payload.assigned_to ? 'dispatched' : 'draft');

    // Parse and normalize checklists
    const checklists = (payload.checklists || []).map((c, i) => {
      if (typeof c === 'string') {
        return {
          id: `ck-${Date.now()}-${i}`,
          item_text: c,
          is_completed: false,
          completed_at: null,
          completed_by: null
        };
      }
      return {
        id: c.id || `ck-${Date.now()}-${i}`,
        item_text: c.item_text,
        is_completed: Boolean(c.is_completed),
        completed_at: c.is_completed ? new Date().toISOString() : null,
        completed_by: null
      };
    });

    const completedCount = checklists.filter((c) => c.is_completed).length;
    const progress =
      checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0;

    const initialHistory = [
      {
        id: `woh-init-${Date.now()}`,
        status: initialStatus,
        old_status: null,
        changed_by: context.user?.id || 'system',
        changed_by_name: context.user?.full_name || 'Operations Dispatcher',
        timestamp: new Date().toISOString(),
        reason: payload.service_request_id
          ? `Created from service request ${payload.service_request_id}`
          : 'Created directly via Operations Dispatch'
      }
    ];

    return {
      ...payload,
      work_order_code: payload.work_order_code || workOrderCode,
      service_request_id: payload.service_request_id || null,
      customer_id: payload.customer_id || null,
      status: initialStatus,
      assigned_technician: techName,
      assigned_at: payload.assigned_to ? new Date().toISOString() : null,
      progress,
      checklists,
      notes: [],
      before_photos: [],
      after_photos: [],
      completion_details: null,
      customer_confirmation: null,
      status_history: initialHistory,
      cost_estimate: payload.cost_estimate || 0,
      actual_cost: 0,
      labor_hours: 0
    };
  }

  async afterCreate(createdRecord, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_CREATED',
      entityType: 'WORK_ORDER',
      entityId: createdRecord.id,
      metadata: {
        code: createdRecord.work_order_code,
        title: createdRecord.title,
        priority: createdRecord.priority,
        assignedTo: createdRecord.assigned_to
      }
    });

    if (createdRecord.assigned_to) {
      await notificationService.sendNotification({
        organizationId,
        userId: createdRecord.assigned_to,
        title: 'New Work Order Assigned',
        message: `You have been assigned to ${createdRecord.work_order_code}: "${createdRecord.title}".`,
        type: 'dispatch',
        actionUrl: '/workorders'
      });
    }

    return createdRecord;
  }

  /**
   * Factory method to create a work order from an approved service request
   */
  async createFromServiceRequest(serviceRequest, organizationId, payload = {}, context = {}) {
    const defaultChecklists = [
      'Site safety assessment & lockout-tagout procedure',
      'Diagnostic inspection of reported failure',
      'Execute repair or preventive servicing',
      'Operational verification test under load',
      'Capture completion photos for compliance vault'
    ];

    const resolvePriority = (urgency) => {
      if (urgency === 'critical') return 'critical';
      if (urgency === 'urgent' || urgency === 'high') return 'high';
      if (urgency === 'low') return 'low';
      return 'normal';
    };

    const workOrderPayload = {
      title: payload.title || serviceRequest.title,
      description: payload.description || serviceRequest.description,
      customer_id: serviceRequest.customer_id,
      customer_name: serviceRequest.customer_name,
      service_request_id: serviceRequest.id,
      assigned_to: payload.assigned_to || serviceRequest.assigned_to || null,
      site: payload.site || serviceRequest.location || 'Client Facility',
      priority: payload.priority || resolvePriority(serviceRequest.urgency),
      scheduled_start: payload.scheduled_start,
      scheduled_end: payload.scheduled_end,
      cost_estimate: payload.cost_estimate || serviceRequest.estimated_cost || 0,
      checklists: payload.initial_checklist || defaultChecklists
    };

    return this.create(workOrderPayload, organizationId, context);
  }

  /**
   * Assign or reassign technician
   */
  async assignTechnician(
    id,
    organizationId,
    { assigned_to, scheduled_start, scheduled_end, scheduled_window },
    context = {}
  ) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const techName = await this.resolveTechnicianName(assigned_to, organizationId);
    const nextStatus = existing.status === 'draft' ? 'dispatched' : existing.status;

    if (existing.status !== nextStatus) {
      this.assertValidTransition(existing.status, nextStatus);
    }

    const historyEntry = {
      status: nextStatus,
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Dispatcher',
      reason: `Assigned to technician ${techName}`
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updates = {
      assigned_to,
      assigned_technician: techName,
      assigned_at: new Date().toISOString(),
      status: nextStatus,
      ...(scheduled_start && { scheduled_start }),
      ...(scheduled_end && { scheduled_end }),
      ...(scheduled_window && { scheduled_window })
    };

    const updated = await this.repository.update(id, organizationId, updates);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_ASSIGNED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { assigned_to, technicianName: techName }
    });

    await notificationService.sendNotification({
      organizationId,
      userId: assigned_to,
      title: 'Work Order Dispatched to You',
      message: `You are assigned to ${existing.work_order_code}: "${existing.title}".`,
      type: 'dispatch',
      actionUrl: '/workorders'
    });

    return updated;
  }

  /**
   * Schedule work order execution window
   */
  async schedule(
    id,
    organizationId,
    { scheduled_start, scheduled_end, scheduled_window },
    context = {}
  ) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const targetStatus = existing.status === 'draft' ? 'scheduled' : existing.status;
    if (existing.status !== targetStatus) {
      this.assertValidTransition(existing.status, targetStatus);
    }

    const historyEntry = {
      status: targetStatus,
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Dispatcher',
      reason: `Scheduled execution for ${scheduled_window || `${scheduled_start} to ${scheduled_end}`}`
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.update(id, organizationId, {
      scheduled_start,
      scheduled_end,
      scheduled_window:
        scheduled_window ||
        `${new Date(scheduled_start).toLocaleDateString()} ${new Date(scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: targetStatus
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_SCHEDULED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { scheduled_start, scheduled_end }
    });

    return updated;
  }

  /**
   * Transition work order status with state machine enforcement
   */
  async updateStatus(id, organizationId, { status, reason }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    this.assertValidTransition(existing.status, status);

    // Business rule checks
    if (status === 'completed' && (!existing.checklists || existing.checklists.length === 0)) {
      // Allowed if completion details exist
    }

    const historyEntry = {
      status,
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Staff',
      reason: reason || `Status updated from ${existing.status} to ${status}`
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updates = {
      status,
      ...(status === 'in_progress' &&
        !existing.started_at && { started_at: new Date().toISOString() }),
      ...(status === 'completed' && { progress: 100 })
    };

    const updated = await this.repository.update(id, organizationId, updates);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: `WORK_ORDER_STATUS_${status.toUpperCase()}`,
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { from: existing.status, to: status, reason }
    });

    return updated;
  }

  /**
   * Add checklist item
   */
  async addChecklistItem(id, organizationId, item, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const checklistItem = await this.repository.addChecklistItem(id, organizationId, item);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_CHECKLIST_ADDED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { itemText: item.item_text }
    });

    return checklistItem;
  }

  /**
   * Toggle or update checklist item
   */
  async updateChecklistItem(id, organizationId, itemId, updates, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const updated = await this.repository.updateChecklistItem(
      id,
      organizationId,
      itemId,
      updates,
      context
    );

    if (!updated) {
      throw new NotFoundError(`Checklist item '${itemId}' not found on work order '${id}'`);
    }

    return updated;
  }

  /**
   * Delete checklist item
   */
  async deleteChecklistItem(id, organizationId, itemId, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const success = await this.repository.deleteChecklistItem(id, organizationId, itemId);
    if (!success) {
      throw new NotFoundError(`Checklist item '${itemId}' not found on work order '${id}'`);
    }

    return { success: true, message: 'Checklist item removed' };
  }

  /**
   * Add job note
   */
  async addJobNote(id, organizationId, { note, is_internal = false }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const noteRecord = await this.repository.addNote(id, organizationId, {
      author_id: context.user?.id || 'staff',
      author_name: context.user?.full_name || 'Technician',
      note,
      is_internal: Boolean(is_internal)
    });

    return noteRecord;
  }

  /**
   * Upload before/after photo
   */
  async addPhoto(id, organizationId, { type, url, caption }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    const photo = await this.repository.addPhoto(id, organizationId, { type, url, caption });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_PHOTO_UPLOADED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { photoType: type, url }
    });

    return photo;
  }

  /**
   * Record completion details and transition status to completed
   */
  async completeWorkOrder(id, organizationId, completionDetails = {}, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    this.assertValidTransition(existing.status, 'completed');

    const historyEntry = {
      status: 'completed',
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Technician',
      reason: completionDetails.completion_notes || 'All field tasks completed and certified'
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.recordCompletion(id, organizationId, {
      ...completionDetails,
      completed_by: context.user?.full_name || 'Assigned Technician'
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_COMPLETED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: {
        actual_cost: completionDetails.actual_cost,
        labor_hours: completionDetails.labor_hours
      }
    });

    // Notify customer that work order is completed and ready for confirmation
    if (existing.customer_id) {
      await notificationService.sendNotification({
        organizationId,
        userId: existing.customer_id,
        title: 'Work Order Completed',
        message: `${existing.work_order_code}: "${existing.title}" is completed. Please review and confirm.`,
        type: 'success',
        actionUrl: '/customer/services'
      });
    }

    return updated;
  }

  /**
   * Customer confirms work order with signature and rating
   */
  async confirmWorkOrder(id, organizationId, confirmationDetails = {}, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    if (!confirmationDetails.customer_signature_url) {
      throw new ValidationError('Customer signature is required for work order signoff');
    }

    const historyEntry = {
      status: existing.status,
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Client Authorized Representative',
      reason: `Customer signoff confirmed with rating: ${confirmationDetails.rating || 5} Stars`
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.recordConfirmation(id, organizationId, {
      ...confirmationDetails,
      confirmed_by: context.user?.full_name || 'Customer'
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_CONFIRMED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: {
        rating: confirmationDetails.rating,
        feedback: confirmationDetails.feedback
      }
    });

    return updated;
  }

  /**
   * Manager closes work order and synchronizes linked service request
   */
  async closeWorkOrder(id, organizationId, { closing_notes = '' }, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(id, organizationId, context);
    if (!existing) throw new NotFoundError(`Work order '${id}' not found`);

    this.assertValidTransition(existing.status, 'closed');

    const historyEntry = {
      status: 'closed',
      old_status: existing.status,
      changed_by: context.user?.id,
      changed_by_name: context.user?.full_name || 'Operations Manager',
      reason: closing_notes || 'Work order audited, verified and officially closed'
    };

    await this.repository.addStatusHistory(id, organizationId, historyEntry);

    const updated = await this.repository.update(id, organizationId, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: context.user?.id,
      closing_notes
    });

    // If work order was linked to a service request, also close the service request
    if (existing.service_request_id) {
      try {
        const { serviceRequestService } = await import('./serviceRequest.service.js');
        const linkedSr = await serviceRequestService.getById(
          existing.service_request_id,
          organizationId,
          context
        );
        if (linkedSr && linkedSr.status !== 'closed') {
          await serviceRequestService.repository.addStatusHistory(
            existing.service_request_id,
            organizationId,
            {
              status: 'closed',
              old_status: linkedSr.status,
              changed_by: context.user?.id,
              changed_by_name: context.user?.full_name || 'Operations Manager',
              notes: `Automatically closed upon closure of work order ${existing.work_order_code}`
            }
          );
          await serviceRequestService.repository.updateStatus(
            existing.service_request_id,
            organizationId,
            'closed'
          );
        }
      } catch {
        // Log notice if linked SR was already closed or not found
      }
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'WORK_ORDER_CLOSED',
      entityType: 'WORK_ORDER',
      entityId: id,
      metadata: { closing_notes }
    });

    return updated;
  }
}

export const workOrderService = new WorkOrderService();
export default workOrderService;
