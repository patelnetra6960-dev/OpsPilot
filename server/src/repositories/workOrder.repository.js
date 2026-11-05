import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class WorkOrderRepository extends BaseRepository {
  constructor() {
    super('work_orders', {
      mockKey: 'work_orders',
      searchFields: ['title', 'description', 'work_order_code', 'site', 'assigned_technician'],
      allowedFilterFields: [
        'status',
        'priority',
        'customer_id',
        'assigned_to',
        'service_request_id',
        'asset_id'
      ],
      allowedSortFields: [
        'created_at',
        'updated_at',
        'priority',
        'status',
        'title',
        'scheduled_start',
        'progress'
      ]
    });
  }

  /**
   * Safe getter for mock store
   */
  getMockList() {
    if (!mockDatabase.work_orders) {
      mockDatabase.work_orders = mockDatabase.workOrders || [];
    }
    return mockDatabase.work_orders;
  }

  /**
   * Record a status transition in work order history
   */
  async addStatusHistory(id, organizationId, historyEntry) {
    this.assertTenantContext(organizationId);

    const fullEntry = {
      id: `woh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...historyEntry
    };

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (wo) {
        if (!wo.status_history) wo.status_history = [];
        wo.status_history.push(fullEntry);
        wo.updated_at = new Date().toISOString();
      }
      return fullEntry;
    }

    const wo = await this.findById(id, organizationId);
    if (!wo) return null;

    const updatedHistory = [...(wo.status_history || []), fullEntry];
    await supabaseAdmin
      .from('work_orders')
      .update({
        status_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return fullEntry;
  }

  /**
   * Add a checklist item and update progress
   */
  async addChecklistItem(id, organizationId, item) {
    this.assertTenantContext(organizationId);

    const checklistItem = {
      id: `ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item_text: item.item_text,
      is_completed: Boolean(item.is_completed),
      completed_at: item.is_completed ? new Date().toISOString() : null,
      completed_by: null
    };

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (wo) {
        if (!wo.checklists) wo.checklists = [];
        wo.checklists.push(checklistItem);

        const completedCount = wo.checklists.filter((c) => c.is_completed).length;
        wo.progress = Math.round((completedCount / wo.checklists.length) * 100);
        wo.updated_at = new Date().toISOString();
      }
      return checklistItem;
    }

    const wo = await this.findById(id, organizationId);
    if (!wo) return null;

    const updatedChecklists = [...(wo.checklists || []), checklistItem];
    const completedCount = updatedChecklists.filter((c) => c.is_completed).length;
    const progress = Math.round((completedCount / updatedChecklists.length) * 100);

    await supabaseAdmin
      .from('work_orders')
      .update({
        checklists: updatedChecklists,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return checklistItem;
  }

  /**
   * Toggle or update checklist item and recalculate progress
   */
  async updateChecklistItem(id, organizationId, itemId, updates, context = {}) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (!wo || !wo.checklists) return null;

      const idx = wo.checklists.findIndex((c) => c.id === itemId);
      if (idx === -1) return null;

      const current = wo.checklists[idx];
      const isNowCompleted =
        updates.is_completed !== undefined ? updates.is_completed : current.is_completed;

      wo.checklists[idx] = {
        ...current,
        ...(updates.item_text !== undefined && { item_text: updates.item_text }),
        is_completed: isNowCompleted,
        completed_at: isNowCompleted ? current.completed_at || new Date().toISOString() : null,
        completed_by: isNowCompleted
          ? current.completed_by || context.user?.full_name || 'Staff'
          : null
      };

      const completedCount = wo.checklists.filter((c) => c.is_completed).length;
      wo.progress = Math.round((completedCount / wo.checklists.length) * 100);
      wo.updated_at = new Date().toISOString();

      return wo.checklists[idx];
    }

    const wo = await this.findById(id, organizationId);
    if (!wo || !wo.checklists) return null;

    const idx = wo.checklists.findIndex((c) => c.id === itemId);
    if (idx === -1) return null;

    const current = wo.checklists[idx];
    const isNowCompleted =
      updates.is_completed !== undefined ? updates.is_completed : current.is_completed;

    wo.checklists[idx] = {
      ...current,
      ...(updates.item_text !== undefined && { item_text: updates.item_text }),
      is_completed: isNowCompleted,
      completed_at: isNowCompleted ? current.completed_at || new Date().toISOString() : null,
      completed_by: isNowCompleted
        ? current.completed_by || context.user?.full_name || 'Staff'
        : null
    };

    const completedCount = wo.checklists.filter((c) => c.is_completed).length;
    const progress = Math.round((completedCount / wo.checklists.length) * 100);

    await supabaseAdmin
      .from('work_orders')
      .update({
        checklists: wo.checklists,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return wo.checklists[idx];
  }

  /**
   * Delete checklist item
   */
  async deleteChecklistItem(id, organizationId, itemId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (!wo || !wo.checklists) return false;

      wo.checklists = wo.checklists.filter((c) => c.id !== itemId);
      const total = wo.checklists.length;
      const completedCount = wo.checklists.filter((c) => c.is_completed).length;
      wo.progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      wo.updated_at = new Date().toISOString();
      return true;
    }

    const wo = await this.findById(id, organizationId);
    if (!wo || !wo.checklists) return false;

    const updatedChecklists = wo.checklists.filter((c) => c.id !== itemId);
    const total = updatedChecklists.length;
    const completedCount = updatedChecklists.filter((c) => c.is_completed).length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    await supabaseAdmin
      .from('work_orders')
      .update({
        checklists: updatedChecklists,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return true;
  }

  /**
   * Add a job note to work order
   */
  async addNote(id, organizationId, noteData) {
    this.assertTenantContext(organizationId);

    const noteRecord = {
      id: `wn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...noteData
    };

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (wo) {
        if (!wo.notes) wo.notes = [];
        wo.notes.push(noteRecord);
        wo.updated_at = new Date().toISOString();
      }
      return noteRecord;
    }

    const wo = await this.findById(id, organizationId);
    if (!wo) return null;

    const updatedNotes = [...(wo.notes || []), noteRecord];
    await supabaseAdmin
      .from('work_orders')
      .update({
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return noteRecord;
  }

  /**
   * Add photo (before or after)
   */
  async addPhoto(id, organizationId, { type, url, caption }) {
    this.assertTenantContext(organizationId);

    const photoRecord = {
      id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      caption: caption || '',
      uploaded_at: new Date().toISOString()
    };

    const photoField = type === 'before' ? 'before_photos' : 'after_photos';

    if (env.isMockMode || !supabaseAdmin) {
      const list = this.getMockList();
      const wo = list.find((item) => item.id === id && item.organization_id === organizationId);
      if (wo) {
        if (!wo[photoField]) wo[photoField] = [];
        wo[photoField].push(photoRecord);
        wo.updated_at = new Date().toISOString();
      }
      return photoRecord;
    }

    const wo = await this.findById(id, organizationId);
    if (!wo) return null;

    const currentPhotos = wo[photoField] || [];
    const updatedPhotos = [...currentPhotos, photoRecord];

    await supabaseAdmin
      .from('work_orders')
      .update({
        [photoField]: updatedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    return photoRecord;
  }

  /**
   * Record completion details and advance work order status
   */
  async recordCompletion(id, organizationId, completionDetails) {
    this.assertTenantContext(organizationId);

    const updates = {
      status: 'completed',
      progress: 100,
      completion_details: {
        completed_at: new Date().toISOString(),
        ...completionDetails
      },
      actual_cost:
        completionDetails.actual_cost !== undefined ? completionDetails.actual_cost : undefined,
      labor_hours:
        completionDetails.labor_hours !== undefined ? completionDetails.labor_hours : undefined,
      updated_at: new Date().toISOString()
    };

    return this.update(id, organizationId, updates);
  }

  /**
   * Record customer confirmation
   */
  async recordConfirmation(id, organizationId, confirmationDetails) {
    this.assertTenantContext(organizationId);

    const updates = {
      customer_confirmation: {
        confirmed_at: new Date().toISOString(),
        ...confirmationDetails
      },
      customer_signature_url: confirmationDetails.customer_signature_url,
      updated_at: new Date().toISOString()
    };

    return this.update(id, organizationId, updates);
  }
}

export const workOrderRepository = new WorkOrderRepository();
export default workOrderRepository;
