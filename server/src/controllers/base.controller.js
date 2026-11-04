import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

/**
 * Enterprise Base Controller for OpsPilot Business Modules.
 * Standardizes HTTP status codes, request parameter unpacking,
 * tenant scoping, and response envelopes.
 */
export class BaseController {
  /**
   * @param {import('../services/base.service.js').BaseService} service - Domain service
   * @param {string} resourceName - Human-readable resource name (e.g., 'Customer')
   */
  constructor(service, resourceName = 'Resource') {
    this.service = service;
    this.resourceName = resourceName;

    // Bind methods to preserve `this` context when mounted directly on Express routes
    this.list = asyncHandler(this.handleList.bind(this));
    this.getById = asyncHandler(this.handleGetById.bind(this));
    this.create = asyncHandler(this.handleCreate.bind(this));
    this.update = asyncHandler(this.handleUpdate.bind(this));
    this.delete = asyncHandler(this.handleDelete.bind(this));
    this.executeAction = asyncHandler(this.handleExecuteAction.bind(this));
  }

  /**
   * Extracts user and tenant execution context from Express request
   */
  getContext(req) {
    return {
      user: req.user,
      membership: req.membership,
      userToken: req.token,
      tenantId: req.tenant?.id,
      ip: req.ip,
      requestId: req.id
    };
  }

  /**
   * Handles GET / (List with pagination, sorting, search, filtering)
   */
  async handleList(req, res) {
    const organizationId = req.tenant.id;
    const { page, limit, sortBy, sortOrder, search, status, from_date, to_date, ...customFilters } =
      req.query || {};

    const queryOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc',
      search,
      status,
      from_date,
      to_date,
      filters: customFilters
    };

    const result = await this.service.list(organizationId, queryOptions, this.getContext(req));
    return sendPaginated(
      res,
      result.data,
      result.pagination,
      `${this.resourceName} list retrieved successfully`,
      200
    );
  }

  /**
   * Handles GET /:id (Retrieve single resource)
   */
  async handleGetById(req, res) {
    const organizationId = req.tenant.id;
    const { id } = req.params;

    const record = await this.service.getById(id, organizationId, this.getContext(req));
    return sendSuccess(res, record, `${this.resourceName} retrieved successfully`, 200);
  }

  /**
   * Handles POST / (Create new resource)
   */
  async handleCreate(req, res) {
    const organizationId = req.tenant.id;
    const payload = req.body;

    const created = await this.service.create(payload, organizationId, this.getContext(req));
    return sendSuccess(res, created, `${this.resourceName} created successfully`, 201);
  }

  /**
   * Handles PATCH /:id (Partial update)
   */
  async handleUpdate(req, res) {
    const organizationId = req.tenant.id;
    const { id } = req.params;
    const updates = req.body;

    const updated = await this.service.update(id, updates, organizationId, this.getContext(req));
    return sendSuccess(res, updated, `${this.resourceName} updated successfully`, 200);
  }

  /**
   * Handles DELETE /:id (Soft deletion)
   */
  async handleDelete(req, res) {
    const organizationId = req.tenant.id;
    const { id } = req.params;

    const result = await this.service.delete(id, organizationId, this.getContext(req));
    return sendSuccess(res, result, `${this.resourceName} deleted successfully`, 200);
  }

  /**
   * Handles POST /:id/actions/:action (Business workflow action)
   */
  async handleExecuteAction(req, res) {
    const organizationId = req.tenant.id;
    const { id, action } = req.params;
    const payload = req.body;

    const result = await this.service.executeAction(
      id,
      action,
      payload,
      organizationId,
      this.getContext(req)
    );
    return sendSuccess(
      res,
      result,
      `Action '${action}' executed successfully on ${this.resourceName}`,
      200
    );
  }
}

export default BaseController;
