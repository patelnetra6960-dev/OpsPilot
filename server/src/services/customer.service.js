import BaseService from './base.service.js';
import customerRepository from '../repositories/customer.repository.js';
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
      customer_code: payload.customer_code || `CUST-${Math.floor(100000 + Math.random() * 900000)}`
    };
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
