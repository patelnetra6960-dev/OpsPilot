import { BaseController } from './base.controller.js';
import { assetService } from '../services/asset.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class AssetController extends BaseController {
  constructor() {
    super(assetService, 'Asset');

    this.assign = asyncHandler(this.handleAssign.bind(this));
    this.updateStatus = asyncHandler(this.handleUpdateStatus.bind(this));
    this.maintenance = asyncHandler(this.handleMaintenance.bind(this));
    this.getStats = asyncHandler(this.handleGetStats.bind(this));
  }

  async handleAssign(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.assignAsset(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Asset assignment updated');
  }

  async handleUpdateStatus(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);
    const { status, reason } = req.body;

    const result = await this.service.updateStatus(id, organizationId, status, reason, context);
    return sendSuccess(res, result, 'Asset status updated');
  }

  async handleMaintenance(req, res) {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const context = this.getContext(req);

    const result = await this.service.addMaintenanceLog(id, organizationId, req.body, context);
    return sendSuccess(res, result, 'Asset maintenance log recorded');
  }

  async handleGetStats(req, res) {
    const organizationId = req.tenant.id;
    const stats = await this.service.getStats(organizationId);
    return sendSuccess(res, stats, 'Asset statistics retrieved');
  }
}

export const assetController = new AssetController();
export default assetController;
