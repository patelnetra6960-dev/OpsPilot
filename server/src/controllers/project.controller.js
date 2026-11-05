import BaseController from './base.controller.js';
import projectService from '../services/project.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class ProjectController extends BaseController {
  constructor() {
    super(projectService, 'Project');

    this.getMembers = asyncHandler(this.handleGetMembers.bind(this));
    this.addMember = asyncHandler(this.handleAddMember.bind(this));
    this.removeMember = asyncHandler(this.handleRemoveMember.bind(this));
    this.getMilestones = asyncHandler(this.handleGetMilestones.bind(this));
    this.addMilestone = asyncHandler(this.handleAddMilestone.bind(this));
    this.updateMilestone = asyncHandler(this.handleUpdateMilestone.bind(this));
  }

  async handleGetMembers(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const members = await this.service.getMembers(id, organizationId, this.getContext(req));
    return sendSuccess(res, members, 'Project members retrieved successfully');
  }

  async handleAddMember(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const member = await this.service.addMember(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, member, 'Member assigned to project successfully', 201);
  }

  async handleRemoveMember(req, res) {
    const { id, memberId } = req.params;
    const organizationId = req.tenant.id;
    await this.service.removeMember(id, memberId, organizationId, this.getContext(req));
    return sendSuccess(res, { removed: true }, 'Member removed from project successfully');
  }

  async handleGetMilestones(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const milestones = await this.service.getMilestones(id, organizationId, this.getContext(req));
    return sendSuccess(res, milestones, 'Project milestones retrieved successfully');
  }

  async handleAddMilestone(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const milestone = await this.service.addMilestone(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, milestone, 'Project milestone added successfully', 201);
  }

  async handleUpdateMilestone(req, res) {
    const { id, milestoneId } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.updateMilestone(
      id,
      milestoneId,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Project milestone updated successfully');
  }
}

export const projectController = new ProjectController();
export default projectController;
