import BaseService from './base.service.js';
import customerRepository from '../repositories/customer.repository.js';
import auditService from './audit.service.js';
import { ConflictError } from '../utils/errors.js';
import { mockDatabase, supabaseAdmin } from '../config/supabase.js';
import env from '../config/env.js';

export class CustomerService extends BaseService {
  constructor() {
    super(customerRepository, 'Customer');
  }

  async beforeCreate(payload, organizationId, _context) {
    const email = payload.email.toLowerCase().trim();

    // Check duplicate customer email within the active organization
    if (env.isMockMode || !supabaseAdmin) {
      const exists = (mockDatabase.customers || []).some(
        (c) =>
          c.organization_id === organizationId && c.email?.toLowerCase() === email && !c.deleted_at
      );
      if (exists) {
        throw new ConflictError(
          `Customer with email '${email}' already exists in this organization`
        );
      }
    } else {
      const { data } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .is('deleted_at', null)
        .maybeSingle();

      if (data) {
        throw new ConflictError(
          `Customer with email '${email}' already exists in this organization`
        );
      }
    }

    return {
      ...payload,
      email,
      customer_code: payload.customer_code || `CUST-${Math.floor(100000 + Math.random() * 900000)}`,
      sla_tier: payload.sla_tier || 'standard',
      status: payload.status || 'active',
      lead_status: payload.lead_status || 'active'
    };
  }

  async afterCreate(createdRecord, organizationId, context = {}) {
    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: createdRecord.id,
      metadata: { name: createdRecord.name, email: createdRecord.email }
    });
    return createdRecord;
  }

  /**
   * Get notes thread for customer
   */
  async getNotes(customerId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(customerId, organizationId);
    return customerRepository.findNotes(customerId, organizationId);
  }

  /**
   * Add internal note for customer
   */
  async addNote(customerId, organizationId, payload, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(customerId, organizationId);

    const note = await customerRepository.addNote(customerId, organizationId, {
      note: payload.note,
      author_id: context.user?.id || null,
      author_name: context.user?.full_name || 'Ops Team Member'
    });

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'CUSTOMER_NOTE_ADDED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      metadata: { noteId: note.id }
    });

    return note;
  }

  /**
   * Get interaction and transaction history
   */
  async getHistory(customerId, organizationId) {
    this.assertTenant(organizationId);
    await this.getById(customerId, organizationId);
    return customerRepository.findHistory(customerId, organizationId);
  }

  /**
   * Update lead stage and follow-up
   */
  async updateFollowUp(customerId, organizationId, payload, context = {}) {
    this.assertTenant(organizationId);
    await this.getById(customerId, organizationId);

    const updated = await customerRepository.updateFollowUp(customerId, organizationId, payload);

    await auditService.recordSecurityEvent({
      organizationId,
      userId: context.user?.id,
      action: 'CUSTOMER_FOLLOWUP_UPDATED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      metadata: { lead_status: payload.lead_status, follow_up_date: payload.follow_up_date }
    });

    return updated;
  }

  /**
   * Action handler: Suspend customer account
   */
  async handleAction_suspend(customer, payload, organizationId, context) {
    return this.update(
      customer.id,
      {
        status: 'suspended',
        notes: payload?.notes || customer.notes
      },
      organizationId,
      context
    );
  }

  /**
   * Action handler: Reactivate customer account
   */
  async handleAction_activate(customer, payload, organizationId, context) {
    return this.update(
      customer.id,
      {
        status: 'active',
        notes: payload?.notes || customer.notes
      },
      organizationId,
      context
    );
  }
}

export const customerService = new CustomerService();
export default customerService;
