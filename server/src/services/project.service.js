import BaseService from './base.service.js';
import projectRepository from '../repositories/project.repository.js';
import auditService from './audit.service.js';

export class ProjectService extends BaseService {
  constructor() {
    super(projectRepository, 'Project');
  }

  async beforeCreate(payload, _organizationId) {
    const code = payload.project_code || `PRJ-${Date.now().toString().slice(-6)}`;
    return {
      ...payload,
      project_code: code,
      progress: payload.progress || 0,
      status: payload.status || 'planning',
      health: payload.health || 'on_track'
    };
  }

  async afterCreate(createdRecord, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: createdRecord.id,
      metadata: { code: createdRecord.project_code, name: createdRecord.name }
    });
    return createdRecord;
  }

  async getMembers(projectId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    return projectRepository.findMembers(projectId, organizationId);
  }

  async addMember(projectId, organizationId, memberData, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    const member = await projectRepository.addMember(projectId, organizationId, memberData);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PROJECT_MEMBER_ASSIGNED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { workforceMemberId: memberData.workforce_member_id }
    });

    return member;
  }

  async removeMember(projectId, memberId, organizationId, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    const removed = await projectRepository.removeMember(projectId, memberId, organizationId);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PROJECT_MEMBER_REMOVED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { memberId }
    });

    return removed;
  }

  async getMilestones(projectId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    return projectRepository.findMilestones(projectId, organizationId);
  }

  async addMilestone(projectId, organizationId, milestoneData, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    const milestone = await projectRepository.addMilestone(
      projectId,
      organizationId,
      milestoneData
    );

    // Update progress automatically
    await this.recalculateProgress(projectId, organizationId);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PROJECT_MILESTONE_ADDED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { milestoneId: milestone.id, title: milestone.title }
    });

    return milestone;
  }

  async updateMilestone(projectId, milestoneId, organizationId, updates, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(projectId, organizationId);
    const updated = await projectRepository.updateMilestone(milestoneId, organizationId, updates);

    // Recalculate progress based on completed milestones
    await this.recalculateProgress(projectId, organizationId);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'PROJECT_MILESTONE_UPDATED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { milestoneId, status: updates.status }
    });

    return updated;
  }

  async recalculateProgress(projectId, organizationId) {
    const milestones = await projectRepository.findMilestones(projectId, organizationId);
    if (!milestones || milestones.length === 0) return;

    const completed = milestones.filter((m) => m.status === 'completed').length;
    const progress = Math.round((completed / milestones.length) * 100);

    await projectRepository.update(projectId, organizationId, {
      progress,
      status: progress === 100 ? 'completed' : 'in_progress'
    });
  }
}

export const projectService = new ProjectService();
export default projectService;
