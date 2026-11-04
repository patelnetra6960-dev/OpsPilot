import BaseRepository from './base.repository.js';

export class CustomerRepository extends BaseRepository {
  constructor() {
    super('customers', {
      mockKey: 'customers',
      searchFields: ['name', 'company_name', 'email', 'customer_code', 'phone'],
      allowedFilterFields: ['status', 'sla_tier', 'user_id'],
      allowedSortFields: ['created_at', 'updated_at', 'name', 'status', 'sla_tier', 'customer_code']
    });
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;
