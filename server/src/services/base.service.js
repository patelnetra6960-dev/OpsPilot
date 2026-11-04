import { NotFoundError, TenantIsolationError, BusinessRuleError } from '../utils/errors.js';

/**
 * Enterprise Base Service Pattern for OpsPilot Business Modules.
 * Encapsulates domain logic, lifecycle hooks, business constraints,
 * and tenant isolation guarantees.
 */
export class BaseService {
  /**
   * @param {import('../repositories/base.repository.js').BaseRepository} repository - Domain repository
   * @param {string} resourceName - Human-readable resource name (e.g., 'Customer', 'Project')
   */
  constructor(repository, resourceName = 'Resource') {
    this.repository = repository;
    this.resourceName = resourceName;
  }

  /**
   * Asserts tenant context presence
   */
  assertTenant(organizationId) {
    if (!organizationId) {
      throw new TenantIsolationError(
        `Fatal Security Violation: organizationId is required for service '${this.resourceName}'`
      );
    }
  }

  /**
   * List domain resources with filtering, search, sorting, and pagination
   */
  async list(organizationId, queryOptions = {}, context = {}) {
    this.assertTenant(organizationId);
    return this.repository.findMany(organizationId, queryOptions, context.userToken);
  }

  /**
   * Retrieve resource by ID within tenant
   */
  async getById(id, organizationId, context = {}) {
    this.assertTenant(organizationId);
    const record = await this.repository.findById(id, organizationId, {}, context.userToken);
    if (!record) {
      throw new NotFoundError(this.resourceName, id);
    }
    return record;
  }

  /**
   * Create new domain resource with lifecycle hooks
   */
  async create(payload, organizationId, context = {}) {
    this.assertTenant(organizationId);

    // Lifecycle hook: pre-creation validation & enrichment
    const preparedPayload = await this.beforeCreate(payload, organizationId, context);

    const createdRecord = await this.repository.create(
      preparedPayload,
      organizationId,
      context.userToken
    );

    // Lifecycle hook: post-creation actions (e.g. audit logs, sidecars)
    await this.afterCreate(createdRecord, organizationId, context);

    return createdRecord;
  }

  /**
   * Update existing domain resource with lifecycle hooks
   */
  async update(id, updates, organizationId, context = {}) {
    this.assertTenant(organizationId);

    // Verify entity existence and tenant ownership
    const existing = await this.getById(id, organizationId, context);

    // Lifecycle hook: pre-update validation & transform
    const sanitizedUpdates = await this.beforeUpdate(existing, updates, organizationId, context);

    const updatedRecord = await this.repository.update(
      id,
      organizationId,
      sanitizedUpdates,
      context.userToken
    );

    // Lifecycle hook: post-update actions
    await this.afterUpdate(updatedRecord, existing, organizationId, context);

    return updatedRecord;
  }

  /**
   * Soft-delete domain resource with lifecycle hooks
   */
  async delete(id, organizationId, context = {}) {
    this.assertTenant(organizationId);

    // Verify entity existence
    const existing = await this.getById(id, organizationId, context);

    // Lifecycle hook: pre-deletion checks
    await this.beforeDelete(existing, organizationId, context);

    const deletedRecord = await this.repository.softDelete(id, organizationId, context.userToken);

    // Lifecycle hook: post-deletion actions
    await this.afterDelete(deletedRecord, organizationId, context);

    return { id, deleted: true, deletedAt: deletedRecord.deleted_at };
  }

  /**
   * Execute business action / state machine transition
   */
  async executeAction(id, actionName, actionPayload, organizationId, context = {}) {
    this.assertTenant(organizationId);
    if (!actionName || typeof actionName !== 'string') {
      throw new BusinessRuleError('Action name is required');
    }
    const existing = await this.getById(id, organizationId, context);

    const handlerMethod = `handleAction_${actionName.toLowerCase()}`;
    if (typeof this[handlerMethod] === 'function') {
      return this[handlerMethod](existing, actionPayload, organizationId, context);
    }

    throw new BusinessRuleError(
      `Unsupported action '${actionName}' for resource '${this.resourceName}'`
    );
  }

  // --- Overrideable Lifecycle Hooks ---

  async beforeCreate(payload, _organizationId, _context) {
    return payload;
  }

  async afterCreate(_record, _organizationId, _context) {
    // Default no-op
  }

  async beforeUpdate(_existing, updates, _organizationId, _context) {
    return updates;
  }

  async afterUpdate(_updated, _existing, _organizationId, _context) {
    // Default no-op
  }

  async beforeDelete(_existing, _organizationId, _context) {
    // Default no-op
  }

  async afterDelete(_deleted, _organizationId, _context) {
    // Default no-op
  }
}

export default BaseService;
