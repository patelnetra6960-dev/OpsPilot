import BaseController from './base.controller.js';
import workOrderService from '../services/workOrder.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class WorkOrderController extends BaseController {
  constructor() {
    super(workOrderService, 'WorkOrder');

    this.assign = asyncHandler(this.handleAssign.bind(this));
    this.schedule = asyncHandler(this.handleSchedule.bind(this));
    this.changeStatus = asyncHandler(this.handleChangeStatus.bind(this));
    this.addChecklist = asyncHandler(this.handleAddChecklist.bind(this));
    this.updateChecklist = asyncHandler(this.handleUpdateChecklist.bind(this));
    this.deleteChecklist = asyncHandler(this.handleDeleteChecklist.bind(this));
    this.addNote = asyncHandler(this.handleAddNote.bind(this));
    this.addPhoto = asyncHandler(this.handleAddPhoto.bind(this));
    this.complete = asyncHandler(this.handleComplete.bind(this));
    this.confirm = asyncHandler(this.handleConfirm.bind(this));
    this.close = asyncHandler(this.handleClose.bind(this));
  }

  async handleAssign(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.assignTechnician(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Technician assigned successfully');
  }

  async handleSchedule(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.schedule(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, updated, 'Work order scheduled successfully');
  }

  async handleChangeStatus(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.updateStatus(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, `Status transitioned to '${req.body.status}'`);
  }

  async handleAddChecklist(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const item = await this.service.addChecklistItem(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, item, 'Checklist item added', 201);
  }

  async handleUpdateChecklist(req, res) {
    const { id, itemId } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.updateChecklistItem(
      id,
      organizationId,
      itemId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Checklist item updated');
  }

  async handleDeleteChecklist(req, res) {
    const { id, itemId } = req.params;
    const organizationId = req.tenant.id;
    await this.service.deleteChecklistItem(id, organizationId, itemId, this.getContext(req));
    return sendSuccess(res, null, 'Checklist item removed');
  }

  async handleAddNote(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const note = await this.service.addJobNote(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, note, 'Job note recorded', 201);
  }

  async handleAddPhoto(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const photo = await this.service.addPhoto(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, photo, 'Photograph uploaded to work order', 201);
  }

  async handleComplete(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.completeWorkOrder(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Work order completed and marked for customer review');
  }

  async handleConfirm(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.confirmWorkOrder(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Customer signature and confirmation recorded');
  }

  async handleClose(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.closeWorkOrder(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Work order closed successfully');
  }
}

export const workOrderController = new WorkOrderController();
export default workOrderController;
