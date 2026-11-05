import BaseController from './base.controller.js';
import serviceRequestService from '../services/serviceRequest.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class ServiceRequestController extends BaseController {
  constructor() {
    super(serviceRequestService, 'ServiceRequest');

    this.review = asyncHandler(this.handleReview.bind(this));
    this.approve = asyncHandler(this.handleApprove.bind(this));
    this.reject = asyncHandler(this.handleReject.bind(this));
    this.addAttachment = asyncHandler(this.handleAddAttachment.bind(this));
    this.convertToWorkOrder = asyncHandler(this.handleConvertToWorkOrder.bind(this));
  }

  async handleReview(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.review(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, updated, 'Service request marked as in review');
  }

  async handleApprove(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.approve(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, updated, 'Service request approved for work order generation');
  }

  async handleReject(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const updated = await this.service.reject(id, organizationId, req.body, this.getContext(req));
    return sendSuccess(res, updated, 'Service request rejected with stated reason');
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
    return sendSuccess(res, attachment, 'Attachment uploaded to service request', 201);
  }

  async handleConvertToWorkOrder(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const result = await this.service.convertToWorkOrder(
      id,
      organizationId,
      req.body,
      this.getContext(req)
    );
    return sendSuccess(res, result, 'Service request successfully converted into Work Order', 201);
  }
}

export const serviceRequestController = new ServiceRequestController();
export default serviceRequestController;
