import { BaseController } from './base.controller.js';
import { supplierService } from '../services/supplier.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class SupplierController extends BaseController {
  constructor() {
    super(supplierService, 'Supplier');

    this.getPurchases = asyncHandler(this.handleGetPurchases.bind(this));
    this.createPurchase = asyncHandler(this.handleCreatePurchase.bind(this));
    this.receivePurchase = asyncHandler(this.handleReceivePurchase.bind(this));
    this.getStats = asyncHandler(this.handleGetStats.bind(this));
  }

  async handleGetPurchases(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;

    const data = await this.service.getPurchases(id, organizationId);
    return sendSuccess(res, data, 'Supplier purchase orders retrieved');
  }

  async handleCreatePurchase(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.createPurchase(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Purchase order created successfully', 201);
  }

  async handleReceivePurchase(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.receivePurchase(id, organizationId, context);
    return sendSuccess(res, result, 'Purchase order received and stock replenished');
  }

  async handleGetStats(req, res) {
    const organizationId = req.tenant.id;
    const stats = await this.service.getStats(organizationId);
    return sendSuccess(res, stats, 'Supplier network statistics retrieved');
  }
}

export const supplierController = new SupplierController();
export default supplierController;
