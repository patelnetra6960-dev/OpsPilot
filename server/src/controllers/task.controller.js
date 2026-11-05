import BaseController from './base.controller.js';
import taskService from '../services/task.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class TaskController extends BaseController {
  constructor() {
    super(taskService, 'Task');

    this.transitionStatus = asyncHandler(this.handleTransitionStatus.bind(this));
    this.getAssignments = asyncHandler(this.handleGetAssignments.bind(this));
    this.assignMember = asyncHandler(this.handleAssignMember.bind(this));
    this.getComments = asyncHandler(this.handleGetComments.bind(this));
    this.addComment = asyncHandler(this.handleAddComment.bind(this));
    this.getAttachments = asyncHandler(this.handleGetAttachments.bind(this));
    this.addAttachment = asyncHandler(this.handleAddAttachment.bind(this));
  }

  async handleTransitionStatus(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const { column_name } = req.body;
    const updated = await this.service.transitionStatus(
      id,
      organizationId,
      column_name,
      this.getContext(req)
    );
    return sendSuccess(res, updated, `Task transitioned to '${column_name}' successfully`);
  }

  async handleGetAssignments(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const assignments = await this.service.getAssignments(id, organizationId, this.getContext(req));
    return sendSuccess(res, assignments, 'Task assignments retrieved successfully');
  }

  async handleAssignMember(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const { workforce_member_id } = req.body;
    const assignment = await this.service.assignMember(
      id,
      organizationId,
      workforce_member_id,
      this.getContext(req)
    );
    return sendSuccess(res, assignment, 'Task assigned to member successfully', 201);
  }

  async handleGetComments(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const comments = await this.service.getComments(id, organizationId, this.getContext(req));
    return sendSuccess(res, comments, 'Task comments retrieved successfully');
  }

  async handleAddComment(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const comment = await this.service.addComment(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, comment, 'Comment added successfully', 201);
  }

  async handleGetAttachments(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const attachments = await this.service.getAttachments(id, organizationId, this.getContext(req));
    return sendSuccess(res, attachments, 'Task attachments retrieved successfully');
  }

  async handleAddAttachment(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const attachment = await this.service.addAttachment(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, attachment, 'Attachment uploaded successfully', 201);
  }
}

export const taskController = new TaskController();
export default taskController;
