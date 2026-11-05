import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class ServiceRequestRepository extends BaseRepository {
  constructor() {
    super('service_requests', {
      mockKey: 'serviceRequests',
      searchFields: ['title', 'description', 'request_code', 'location'],
      allowedFilterFields: [
        'status',
        'urgency',
        'service_type',
        'customer_id',
        'converted_work_order_id',
        'assigned_to'
      ],
      allowedSortFields: ['created_at', 'updated_at', 'urgency', 'status', 'title', 'request_code']
    });
  }

  /**
   * Append status history entry to service request
   */
  async addStatusHistory(id, organizationId, historyEntry) {
    this.assertTenantContext(organizationId);

    const fullEntry = {
      id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...historyEntry
    };

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase.serviceRequests || [];
      const item = list.find((sr) => sr.id === id && sr.organization_id === organizationId);
      if (item) {
        if (!item.status_history) item.status_history = [];
        item.status_history.push(fullEntry);
        item.updated_at = new Date().toISOString();
      }
      return fullEntry;
    }

    // In real mode, status_history can be stored as JSONB column or audit logs
    const existing = await this.findById(id, organizationId);
    if (!existing) return null;

    const updatedHistory = [...(existing.status_history || []), fullEntry];
    await supabaseAdmin
      .from('service_requests')
      .update({
        status_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return fullEntry;
  }

  /**
   * Add attachment to service request
   */
  async addAttachment(id, organizationId, attachment) {
    this.assertTenantContext(organizationId);

    const attachmentRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uploaded_at: new Date().toISOString(),
      ...attachment
    };

    if (env.isMockMode || !supabaseAdmin) {
      const list = mockDatabase.serviceRequests || [];
      const item = list.find((sr) => sr.id === id && sr.organization_id === organizationId);
      if (item) {
        if (!item.attachments) item.attachments = [];
        item.attachments.push(attachmentRecord);
        item.updated_at = new Date().toISOString();
      }
      return attachmentRecord;
    }

    const existing = await this.findById(id, organizationId);
    if (!existing) return null;

    const updatedAttachments = [...(existing.attachments || []), attachmentRecord];
    await supabaseAdmin
      .from('service_requests')
      .update({
        attachments: updatedAttachments,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return attachmentRecord;
  }

  /**
   * Update status with metadata updates
   */
  async updateStatus(id, organizationId, status, metadata = {}) {
    this.assertTenantContext(organizationId);

    const updates = {
      status,
      ...metadata,
      updated_at: new Date().toISOString()
    };

    return this.update(id, organizationId, updates);
  }
}

export const serviceRequestRepository = new ServiceRequestRepository();
export default serviceRequestRepository;
