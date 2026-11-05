import { BaseController } from './base.controller.js';
import { inventoryService } from '../services/inventory.service.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class InventoryController extends BaseController {
  constructor() {
    super(inventoryService, 'InventoryItem');

    this.stockIn = asyncHandler(this.handleStockIn.bind(this));
    this.stockOut = asyncHandler(this.handleStockOut.bind(this));
    this.adjustStock = asyncHandler(this.handleAdjustStock.bind(this));
    this.getTransactions = asyncHandler(this.handleGetTransactions.bind(this));
    this.getLowStock = asyncHandler(this.handleGetLowStock.bind(this));
    this.getStats = asyncHandler(this.handleGetStats.bind(this));
  }

  async handleStockIn(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.stockIn(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Stock received successfully');
  }

  async handleStockOut(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.stockOut(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Stock dispatched successfully');
  }

  async handleAdjustStock(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.adjustStock(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Stock adjusted successfully');
  }

  async handleGetTransactions(req, res) {
    const organizationId = req.tenant.id;
    const { id } = req.params || {};
    const { page = 1, limit = 20 } = req.query || {};

    const { data, pagination } = await this.service.getTransactions(organizationId, {
      itemId: id || null,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    return sendPaginated(res, data, pagination, 'Stock transactions retrieved');
  }

  async handleGetLowStock(req, res) {
    const organizationId = req.tenant.id;
    const data = await this.service.getLowStock(organizationId);
    return sendSuccess(res, data, 'Low stock items retrieved');
  }

  async handleGetStats(req, res) {
    const organizationId = req.tenant.id;
    const stats = await this.service.getStats(organizationId);
    return sendSuccess(res, stats, 'Inventory statistics retrieved');
  }
}

export const inventoryController = new InventoryController();
export default inventoryController;
