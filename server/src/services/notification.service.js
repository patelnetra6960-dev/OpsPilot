import crypto from 'crypto';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getIO, trackEventId } from '../socket/socket.server.js';
import { TenantIsolationError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export class NotificationService {
  /**
   * Safe payload wrapper ensuring event ID for client-side deduplication
   */
  createEventEnvelope(eventType, payload, organizationId) {
    const eventId = payload.eventId || crypto.randomUUID();
    return {
      eventId,
      eventType,
      organizationId,
      timestamp: new Date().toISOString(),
      ...payload
    };
  }

  /**
   * Persist in-app notification and emit via Socket.IO to authenticated user room
   */
  async createNotification(params) {
    const {
      organizationId,
      userId,
      title,
      message,
      type = 'info',
      actionUrl = null,
      data = {},
      eventType = 'notification:new'
    } = params;

    if (!organizationId) {
      throw new TenantIsolationError('organizationId is required for notification dispatch');
    }

    const eventId = data?.eventId || crypto.randomUUID();

    // Prevent duplicate event emission
    if (trackEventId(eventId)) {
      logger.warn(`[Duplicate Event Prevented]: Event ${eventId} was already dispatched`);
      return null;
    }

    const notificationPayload = {
      organization_id: organizationId,
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString()
    };

    // 1. Database Persistence
    const created = await notificationRepository.create(notificationPayload, organizationId);

    // 2. Real-Time Socket.IO Dispatch
    const io = getIO();
    if (io) {
      const envelope = this.createEventEnvelope(
        eventType,
        {
          id: created.id,
          notification: created,
          data
        },
        organizationId
      );

      // Deliver specifically to user's authenticated private room
      io.to(`user:${userId}`).emit('notification:new', envelope);
      if (eventType && eventType !== 'notification:new') {
        io.to(`user:${userId}`).emit(eventType, envelope);
      }

      logger.info(
        `[Real-Time Notification Emitted]: Sent ${eventType} to user:${userId} (Org: ${organizationId})`
      );
    }

    return created;
  }

  /**
   * Backward-compatible dispatcher used by other domain modules
   */
  async sendNotification(params) {
    if (!params.organizationId) {
      return null;
    }
    if (!params.userId) {
      // Organization-wide announcement
      this.emitToOrganization(params.organizationId, 'notification:new', params);
      return params;
    }
    return this.createNotification(params);
  }

  /**
   * Broadcast an organization-wide activity event
   */
  emitToOrganization(organizationId, eventType, payload = {}) {
    if (!organizationId) return;
    const io = getIO();
    if (!io) return;

    const envelope = this.createEventEnvelope(eventType, payload, organizationId);
    io.to(`org:${organizationId}`).emit(eventType, envelope);

    logger.info(`[Real-Time Org Event]: Broadcast ${eventType} to org:${organizationId}`);
  }

  /**
   * Broadcast an activity event to specific role within organization
   */
  emitToRole(organizationId, role, eventType, payload = {}) {
    if (!organizationId || !role) return;
    const io = getIO();
    if (!io) return;

    const envelope = this.createEventEnvelope(eventType, payload, organizationId);
    io.to(`org:${organizationId}:${role}`).emit(eventType, envelope);

    logger.info(`[Real-Time Role Event]: Broadcast ${eventType} to org:${organizationId}:${role}`);
  }

  // =========================================================================
  // Domain Notification Triggers
  // =========================================================================

  /**
   * 1. Task Assignment Notification
   */
  async notifyTaskAssigned({ organizationId, task, assignedUserId, assignedByName }) {
    if (!assignedUserId) return null;

    const created = await this.createNotification({
      organizationId,
      userId: assignedUserId,
      title: 'Task Assigned',
      message: `${assignedByName || 'A manager'} assigned you to task: "${task.title}".`,
      type: 'dispatch',
      actionUrl: '/tasks',
      data: { taskId: task.id, priority: task.priority },
      eventType: 'notification:new'
    });

    // Also broadcast activity event to tenant task watchers
    this.emitToOrganization(organizationId, 'task:assigned', {
      task,
      assignedUserId,
      assignedByName
    });

    return created;
  }

  /**
   * 2. Task Status Updates
   */
  async notifyTaskStatusUpdated({ organizationId, task, updatedByName, previousStatus }) {
    const eventPayload = {
      task,
      previousStatus,
      newStatus: task.status,
      updatedByName
    };

    // Broadcast status change to org
    this.emitToOrganization(organizationId, 'task:status_updated', eventPayload);

    // If task has assignee, notify assignee
    if (task.assigned_to) {
      await this.createNotification({
        organizationId,
        userId: task.assigned_to,
        title: 'Task Status Updated',
        message: `Task "${task.title}" status changed to ${task.status.toUpperCase()} by ${updatedByName || 'Team'}.`,
        type: 'info',
        actionUrl: '/tasks',
        data: eventPayload,
        eventType: 'notification:new'
      });
    }
  }

  /**
   * 3. Project Activity Updates
   */
  async notifyProjectUpdated({ organizationId, project, updatedByName, action = 'updated' }) {
    const eventPayload = {
      project,
      action,
      updatedByName
    };

    this.emitToOrganization(organizationId, 'project:updated', eventPayload);
  }

  /**
   * 4. Work Order Updates
   */
  async notifyWorkOrderUpdated({ organizationId, workOrder, updatedByName, targetUserId = null }) {
    const eventPayload = {
      workOrder,
      updatedByName,
      status: workOrder.status
    };

    this.emitToOrganization(organizationId, 'workorder:status_updated', eventPayload);

    if (targetUserId) {
      await this.createNotification({
        organizationId,
        userId: targetUserId,
        title: 'Work Order Updated',
        message: `Work Order ${workOrder.work_order_number || workOrder.id} status is now ${workOrder.status.toUpperCase()}.`,
        type: 'dispatch',
        actionUrl: '/workorders',
        data: eventPayload,
        eventType: 'notification:new'
      });
    }
  }

  /**
   * 5. Expense Approval Notifications
   */
  async notifyExpenseReviewed({ organizationId, expense, reviewerName, status, reason = null }) {
    const isApproved = status === 'approved';
    const title = isApproved ? 'Expense Claim Approved' : 'Expense Claim Rejected';
    const message = isApproved
      ? `Your claim (${expense.claim_code}) for $${Number(expense.amount).toFixed(2)} was approved by ${reviewerName}.`
      : `Your claim (${expense.claim_code}) was rejected by ${reviewerName}. Reason: ${reason || 'Not specified'}`;

    // Target submitting employee
    const targetUserId = expense.user_id;

    if (targetUserId) {
      await this.createNotification({
        organizationId,
        userId: targetUserId,
        title,
        message,
        type: isApproved ? 'success' : 'warning',
        actionUrl: '/expenses',
        data: { expenseId: expense.id, status, claim_code: expense.claim_code },
        eventType: 'notification:new'
      });
    }

    // Broadcast to managers room
    this.emitToRole(organizationId, 'manager', 'expense:status_updated', {
      expense,
      status,
      reviewerName
    });
  }

  /**
   * 6. Customer Request Status Notifications
   */
  async notifyServiceRequestUpdated({ organizationId, serviceRequest, updatedByName, customerUserId = null }) {
    const eventPayload = {
      serviceRequest,
      status: serviceRequest.status,
      updatedByName
    };

    this.emitToOrganization(organizationId, 'service_request:status_updated', eventPayload);

    if (customerUserId) {
      await this.createNotification({
        organizationId,
        userId: customerUserId,
        title: 'Service Request Status Updated',
        message: `Your request "${serviceRequest.title}" (${serviceRequest.request_number || ''}) is now ${serviceRequest.status.toUpperCase()}.`,
        type: 'info',
        actionUrl: '/customer/services',
        data: eventPayload,
        eventType: 'notification:new'
      });
    }
  }

  // =========================================================================
  // Notification Management & Queries
  // =========================================================================

  async listNotifications(userId, organizationId, options = {}) {
    return notificationRepository.findForUser(userId, organizationId, options);
  }

  async getUnreadCount(userId, organizationId) {
    const count = await notificationRepository.getUnreadCount(userId, organizationId);
    return { unreadCount: count };
  }

  async markAsRead(notificationId, userId, organizationId) {
    const updated = await notificationRepository.markAsRead(notificationId, userId, organizationId);
    if (!updated) {
      throw new NotFoundError('Notification not found or access denied');
    }

    // Emit event so other open tabs of this user update read badge instantly
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:read', {
        id: notificationId,
        read: true
      });
    }

    return updated;
  }

  async markAllAsRead(userId, organizationId) {
    const result = await notificationRepository.markAllAsRead(userId, organizationId);

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:read_all', {
        success: true
      });
    }

    return result;
  }

  async deleteNotification(notificationId, userId, organizationId) {
    const deleted = await notificationRepository.deleteForUser(notificationId, userId, organizationId);
    if (!deleted) {
      throw new NotFoundError('Notification not found or access denied');
    }
    return { success: true };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
