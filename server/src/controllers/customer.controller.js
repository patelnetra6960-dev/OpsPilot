import BaseController from './base.controller.js';
import customerService from '../services/customer.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class CustomerController extends BaseController {
  constructor() {
    super(customerService, 'Customer');

    this.getNotes = asyncHandler(this.handleGetNotes.bind(this));
    this.addNote = asyncHandler(this.handleAddNote.bind(this));
    this.getHistory = asyncHandler(this.handleGetHistory.bind(this));
    this.updateFollowUp = asyncHandler(this.handleUpdateFollowUp.bind(this));
  }

  async handleGetNotes(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const notes = await this.service.getNotes(id, organizationId, this.getContext(req));
    return sendSuccess(res, notes, 'Customer notes retrieved successfully');
  }

  async handleAddNote(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const note = await this.service.addNote(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, note, 'Customer note added successfully', 201);
  }

  async handleGetHistory(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const history = await this.service.getHistory(id, organizationId, this.getContext(req));
    return sendSuccess(res, history, 'Customer history retrieved successfully');
  }

  async handleUpdateFollowUp(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.updateFollowUp(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, updated, 'Customer follow-up updated successfully');
  }
}

export const customerController = new CustomerController();
export default customerController;
