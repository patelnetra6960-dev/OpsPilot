import BaseService from './base.service.js';
import taskRepository from '../repositories/task.repository.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';
import subscriptionService from './subscription.service.js';

export class TaskService extends BaseService {
  constructor() {
    super(taskRepository, 'Task');
  }

  async beforeCreate(payload, organizationId, context = {}) {
    if (organizationId) {
      await subscriptionService.checkResourceLimit(organizationId, 'tasks');
    }

    const code = payload.task_code || `TSK-${Date.now().toString().slice(-4)}`;
    return {
      ...payload,
      task_code: code,
      column_name: payload.column_name || 'todo',
      priority: payload.priority || 'normal',
      created_by: context.user?.id || null,
      checklist_total: payload.checklist_total || 0,
      checklist_completed: payload.checklist_completed || 0
    };
  }

  async afterCreate(createdRecord, organizationId, context = {}) {
    // If assigned_to is specified, create initial assignment record
    if (createdRecord.assigned_to) {
      await taskRepository.assignMember(
        createdRecord.id,
        organizationId,
        createdRecord.assigned_to
      );

      await notificationService.notifyTaskAssigned({
        organizationId,
        task: createdRecord,
        assignedUserId: createdRecord.assigned_to,
        assignedByName: context.user?.full_name || 'Manager'
      });
    }

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: createdRecord.id,
      metadata: { code: createdRecord.task_code, title: createdRecord.title }
    });

    return createdRecord;
  }

  /**
   * Transition Kanban column with server-side validation
   */
  async transitionStatus(taskId, organizationId, newColumn, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(taskId, organizationId);

    const oldColumn = existing.column_name || existing.column || 'todo';
    const updated = await taskRepository.transitionStatus(taskId, organizationId, newColumn);

    await notificationService.notifyTaskStatusUpdated({
      organizationId,
      task: updated,
      updatedByName: context.user?.full_name || 'Team member',
      previousStatus: oldColumn
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'TASK_STATUS_TRANSITIONED',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { from: oldColumn, to: newColumn }
    });

    return updated;
  }

  async getAssignments(taskId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(taskId, organizationId);
    return taskRepository.findAssignments(taskId, organizationId);
  }

  async assignMember(taskId, organizationId, workforceMemberId, context = {}) {
    this.assertTenant(organizationId);
    const existing = await this.getById(taskId, organizationId);
    const assignment = await taskRepository.assignMember(taskId, organizationId, workforceMemberId);

    await notificationService.notifyTaskAssigned({
      organizationId,
      task: existing,
      assignedUserId: workforceMemberId,
      assignedByName: context.user?.full_name || 'Manager'
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'TASK_MEMBER_ASSIGNED',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { workforceMemberId }
    });

    return assignment;
  }

  async getComments(taskId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(taskId, organizationId);
    return taskRepository.findComments(taskId, organizationId);
  }

  async addComment(taskId, organizationId, { comment_text }, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(taskId, organizationId);
    const comment = await taskRepository.addComment(taskId, organizationId, {
      user_id: context.user?.id,
      comment_text
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'TASK_COMMENT_ADDED',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { commentId: comment.id }
    });

    return comment;
  }

  async getAttachments(taskId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(taskId, organizationId);
    return taskRepository.findAttachments(taskId, organizationId);
  }

  async addAttachment(taskId, organizationId, attachmentData, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(taskId, organizationId);
    const attachment = await taskRepository.addAttachment(taskId, organizationId, {
      ...attachmentData,
      uploaded_by: context.user?.id
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'TASK_ATTACHMENT_UPLOADED',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { attachmentId: attachment.id, fileName: attachment.file_name }
    });

    return attachment;
  }
}

export const taskService = new TaskService();
export default taskService;
