import BaseRepository from './base.repository.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers', {
      mockKey: 'customers',
      searchFields: ['name', 'company_name', 'email', 'customer_code', 'phone'],
      allowedFilterFields: ['status', 'sla_tier', 'user_id', 'lead_status'],
      allowedSortFields: [
        'created_at',
        'updated_at',
        'name',
        'status',
        'sla_tier',
        'customer_code',
        'follow_up_date'
      ]
    });
  }

  /**
   * Find internal notes for a customer
   */
  async findNotes(customerId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const allNotes = mockDatabase.customer_notes || [];
      return allNotes
        .filter((n) => n.customer_id === customerId && n.organization_id === organizationId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const { data, error } = await supabaseAdmin
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add internal note for a customer
   */
  async addNote(customerId, organizationId, { note, author_id, author_name }) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.customer_notes) mockDatabase.customer_notes = [];
      const newNote = {
        id: `cn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: organizationId,
        customer_id: customerId,
        author_id,
        author_name: author_name || 'Ops Team Member',
        note,
        created_at: new Date().toISOString()
      };
      mockDatabase.customer_notes.push(newNote);
      return newNote;
    }

    const { data, error } = await supabaseAdmin
      .from('customer_notes')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        author_id,
        author_name,
        note
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find interaction history (service requests, invoices, status changes)
   */
  async findHistory(customerId, organizationId) {
    this.assertTenantContext(organizationId);

    let requests = [];
    let invoices = [];

    if (env.isMockMode || !supabaseAdmin) {
      requests = (mockDatabase.serviceRequests || []).filter(
        (sr) => sr.customer_id === customerId && sr.organization_id === organizationId
      );
      invoices = (mockDatabase.invoices || []).filter(
        (inv) => inv.customer_id === customerId && inv.organization_id === organizationId
      );
    } else {
      const [reqRes, invRes] = await Promise.all([
        supabaseAdmin
          .from('service_requests')
          .select('id, request_code, title, status, urgency, created_at')
          .eq('customer_id', customerId)
          .eq('organization_id', organizationId),
        supabaseAdmin
          .from('invoices')
          .select('id, invoice_number, total, status, issue_date, due_date')
          .eq('customer_id', customerId)
          .eq('organization_id', organizationId)
      ]);

      if (reqRes.error) throw reqRes.error;
      if (invRes.error) throw invRes.error;

      requests = reqRes.data || [];
      invoices = invRes.data || [];
    }

    const historyItems = [
      ...requests.map((r) => ({
        id: `sr-${r.id}`,
        type: 'service_request',
        title: `Service Request: ${r.title} (${r.request_code || r.id})`,
        status: r.status,
        timestamp: r.created_at,
        metadata: r
      })),
      ...invoices.map((inv) => ({
        id: `inv-${inv.id}`,
        type: 'invoice',
        title: `Invoice Issued: ${inv.invoice_number || inv.id} ($${Number(inv.total || 0).toFixed(2)})`,
        status: inv.status,
        timestamp: inv.created_at || inv.issue_date,
        metadata: inv
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return historyItems;
  }

  /**
   * Update lead stage and follow-up management
   */
  async updateFollowUp(
    customerId,
    organizationId,
    { lead_status, follow_up_date, follow_up_notes }
  ) {
    this.assertTenantContext(organizationId);

    const updates = {};
    if (lead_status !== undefined) updates.lead_status = lead_status;
    if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date;
    if (follow_up_notes !== undefined) updates.follow_up_notes = follow_up_notes;
    updates.updated_at = new Date().toISOString();

    return this.update(customerId, organizationId, updates);
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;
