import { BaseRepository } from './base.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { NotFoundError } from '../utils/errors.js';

export class AssetRepository extends BaseRepository {
  constructor() {
    super('assets', {
      mockKey: 'assets',
      searchFields: [
        'asset_tag',
        'name',
        'category',
        'location',
        'serial_number',
        'department',
        'assigned_to_name'
      ],
      allowedFilterFields: ['category', 'status', 'assigned_to', 'department'],
      allowedSortFields: [
        'asset_tag',
        'name',
        'purchase_cost',
        'created_at',
        'updated_at',
        'next_service_date'
      ]
    });
  }

  /**
   * Find physical asset by asset tag within active organization
   */
  async findByTag(assetTag, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const assets = mockDatabase.assets || [];
      return (
        assets.find(
          (a) =>
            a.organization_id === organizationId &&
            a.asset_tag.toLowerCase() === assetTag.trim().toLowerCase() &&
            !a.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('asset_tag', assetTag.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Assign asset ownership to a workforce member / department / site
   */
  async assignAsset(id, organizationId, { assigned_to, department, location, notes }, _userId) {
    this.assertTenantContext(organizationId);

    const asset = await this.findById(id, organizationId);
    if (!asset) throw new NotFoundError('Asset', id);

    let assigneeName = 'Unassigned';
    if (assigned_to) {
      if (env.isMockMode || !supabaseAdmin) {
        const member = (mockDatabase.workforce || []).find(
          (w) => w.id === assigned_to && w.organization_id === organizationId
        );
        if (member) assigneeName = `${member.first_name} ${member.last_name}`;
      } else {
        const { data: member } = await supabaseAdmin
          .from('workforce_members')
          .select('first_name, last_name')
          .eq('id', assigned_to)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (member) assigneeName = `${member.first_name} ${member.last_name}`;
      }
    }

    const newStatus = assigned_to ? 'assigned' : 'available';
    const now = new Date().toISOString();

    const updates = {
      assigned_to: assigned_to || null,
      assigned_to_name: assigneeName,
      department: department || asset.department,
      location: location || asset.location,
      status: newStatus,
      updated_at: now
    };

    if (notes) {
      updates.metadata = { ...(asset.metadata || {}), last_assignment_notes: notes };
    }

    return this.update(id, organizationId, updates);
  }

  /**
   * Update operational status of asset
   */
  async updateStatus(id, organizationId, status, reason, _userId) {
    this.assertTenantContext(organizationId);

    const asset = await this.findById(id, organizationId);
    if (!asset) throw new NotFoundError('Asset', id);

    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updates.metadata = { ...(asset.metadata || {}), status_reason: reason };
    }

    return this.update(id, organizationId, updates);
  }

  /**
   * Record asset maintenance event in maintenance history
   */
  async addMaintenanceLog(id, organizationId, logData, _userId) {
    this.assertTenantContext(organizationId);

    const asset = await this.findById(id, organizationId);
    if (!asset) throw new NotFoundError('Asset', id);

    const logEntry = {
      id: `maint-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      date: logData.date,
      type: logData.type || 'scheduled',
      description: logData.description,
      cost: Number(logData.cost || 0),
      performed_by: logData.performed_by || 'Field Technician',
      next_service_due: logData.next_service_due || null,
      created_at: new Date().toISOString()
    };

    const history = Array.isArray(asset.maintenance_history) ? [...asset.maintenance_history] : [];
    history.unshift(logEntry);

    const updates = {
      maintenance_history: history,
      last_service_date: logData.date,
      updated_at: new Date().toISOString()
    };

    if (logData.next_service_due) {
      updates.next_service_date = logData.next_service_due;
    }

    // Set status to maintenance if scheduled/repair and currently available/assigned
    if (logData.type === 'repair' && asset.status !== 'retired') {
      updates.status = 'maintenance';
    }

    return this.update(id, organizationId, updates);
  }

  /**
   * Get operational metrics for physical asset fleet
   */
  async getAssetStats(organizationId) {
    this.assertTenantContext(organizationId);

    const assets =
      env.isMockMode || !supabaseAdmin
        ? (mockDatabase.assets || []).filter(
            (a) => a.organization_id === organizationId && !a.deleted_at
          )
        : (
            await supabaseAdmin
              .from(this.tableName)
              .select('*')
              .eq('organization_id', organizationId)
              .is('deleted_at', null)
          ).data || [];

    const totalAssets = assets.length;
    let totalValuation = 0;
    let availableCount = 0;
    let assignedCount = 0;
    let maintenanceCount = 0;
    let retiredCount = 0;

    for (const a of assets) {
      totalValuation += Number(a.purchase_cost || 0);
      switch (a.status) {
        case 'available':
          availableCount++;
          break;
        case 'assigned':
          assignedCount++;
          break;
        case 'maintenance':
          maintenanceCount++;
          break;
        case 'retired':
        case 'damaged':
          retiredCount++;
          break;
      }
    }

    return {
      totalAssets,
      totalValuation: Math.round(totalValuation * 100) / 100,
      availableCount,
      assignedCount,
      maintenanceCount,
      retiredCount,
      inServiceCount: availableCount + assignedCount
    };
  }
}

export const assetRepository = new AssetRepository();
export default assetRepository;
