import { BaseService } from './base.service.js';
import { assetRepository } from '../repositories/asset.repository.js';
import { workforceRepository } from '../repositories/workforce.repository.js';
import { auditService } from './audit.service.js';
import { ConflictError, ValidationError } from '../utils/errors.js';

export class AssetService extends BaseService {
  constructor() {
    super(assetRepository, 'Asset');
  }

  async beforeCreate(payload, organizationId, _context = {}) {
    const tag = payload.asset_tag?.trim().toUpperCase();
    if (!tag) throw new ValidationError('Asset tag is required');

    // Check Asset Tag uniqueness within active organization
    const existing = await this.repository.findByTag(tag, organizationId);
    if (existing) {
      throw new ConflictError(
        `Physical asset with tag '${tag}' already exists in this organization.`
      );
    }

    const purchaseCost = Number(payload.purchase_cost || 0);
    if (purchaseCost < 0) {
      throw new ValidationError('Purchase cost cannot be negative.');
    }

    let assignedToName = 'Unassigned';
    if (payload.assigned_to) {
      try {
        const member = await workforceRepository.findById(payload.assigned_to, organizationId);
        if (member) assignedToName = `${member.first_name} ${member.last_name}`;
      } catch {
        // Fall back gracefully
      }
    }

    return {
      ...payload,
      asset_tag: tag,
      purchase_cost: purchaseCost,
      status: payload.assigned_to ? 'assigned' : payload.status || 'available',
      assigned_to_name: assignedToName,
      maintenance_history: payload.maintenance_history || []
    };
  }

  async afterCreate(created, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'ASSET_REGISTERED',
      entityType: 'ASSET',
      entityId: created.id,
      metadata: { asset_tag: created.asset_tag, category: created.category, name: created.name }
    });

    return created;
  }

  async beforeUpdate(id, payload, organizationId, _context = {}) {
    if (payload.asset_tag) {
      const tag = payload.asset_tag.trim().toUpperCase();
      const existing = await this.repository.findByTag(tag, organizationId);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Another asset with tag '${tag}' already exists.`);
      }
      payload.asset_tag = tag;
    }

    return payload;
  }

  /**
   * Assign asset to workforce member and update deployment location
   */
  async assignAsset(id, organizationId, assignData, context = {}) {
    const updated = await this.repository.assignAsset(
      id,
      organizationId,
      assignData,
      context.user?.id
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'ASSET_ASSIGNED',
      entityType: 'ASSET',
      entityId: id,
      metadata: {
        assigned_to: assignData.assigned_to,
        assignee_name: updated.assigned_to_name,
        location: updated.location
      }
    });

    return updated;
  }

  /**
   * Update operational status of asset
   */
  async updateStatus(id, organizationId, status, reason, context = {}) {
    const updated = await this.repository.updateStatus(
      id,
      organizationId,
      status,
      reason,
      context.user?.id
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'ASSET_STATUS_UPDATED',
      entityType: 'ASSET',
      entityId: id,
      metadata: { status, reason }
    });

    return updated;
  }

  /**
   * Record maintenance event in asset history
   */
  async addMaintenanceLog(id, organizationId, logData, context = {}) {
    const updated = await this.repository.addMaintenanceLog(
      id,
      organizationId,
      logData,
      context.user?.id
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'ASSET_MAINTENANCE_RECORDED',
      entityType: 'ASSET',
      entityId: id,
      metadata: {
        service_date: logData.date,
        service_type: logData.type,
        cost: logData.cost
      }
    });

    return updated;
  }

  /**
   * Aggregated asset fleet statistics
   */
  async getStats(organizationId) {
    return this.repository.getAssetStats(organizationId);
  }
}

export const assetService = new AssetService();
export default assetService;
