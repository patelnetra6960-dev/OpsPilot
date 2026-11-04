import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant, requireTenantRole } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

/**
 * Enterprise CRUD Route Factory for OpsPilot Business Modules.
 * Standardizes HTTP verbs, tenant boundary enforcement, RBAC guards,
 * and request validation schemas.
 *
 * @param {object} config
 * @param {import('../controllers/base.controller.js').BaseController} config.controller - Domain controller instance
 * @param {object} config.validator - Zod validation suite (query, params, create, update, action)
 * @param {object} [config.roles] - Role access matrix
 * @param {string[]} [config.roles.read] - Allowed roles for reading (default: all internal roles)
 * @param {string[]} [config.roles.create] - Allowed roles for creation (default: manager/admin/owner)
 * @param {string[]} [config.roles.update] - Allowed roles for updating (default: manager/admin/owner)
 * @param {string[]} [config.roles.delete] - Allowed roles for deletion (default: admin/owner)
 * @param {string[]} [config.roles.action] - Allowed roles for actions (default: manager/admin/owner)
 * @param {Function} [config.extendRouter] - Callback to mount custom business endpoints
 */
export const createCrudRouter = ({ controller, validator, roles = {}, extendRouter = null }) => {
  const router = Router();

  const readRoles = roles.read || ['owner', 'admin', 'manager', 'employee', 'member'];
  const createRoles = roles.create || ['owner', 'admin', 'manager'];
  const updateRoles = roles.update || ['owner', 'admin', 'manager'];
  const deleteRoles = roles.delete || ['owner', 'admin'];
  const actionRoles = roles.action || ['owner', 'admin', 'manager'];

  // Global Guards: Authentication and verified active tenant isolation
  router.use(requireAuth);
  router.use(requireTenant);

  // Hook for custom pre-CRUD sub-routes if supplied
  if (typeof extendRouter === 'function') {
    extendRouter(router, { requireAuth, requireTenant, requireTenantRole, validate, controller });
  }

  // GET / - Read list with pagination, search, sorting, filtering
  router.get(
    '/',
    requireTenantRole(readRoles),
    validator?.query ? validate(validator.query, 'query') : (req, res, next) => next(),
    controller.list
  );

  // GET /:id - Read single entity by ID
  router.get(
    '/:id',
    requireTenantRole(readRoles),
    validator?.params ? validate(validator.params, 'params') : (req, res, next) => next(),
    controller.getById
  );

  // POST / - Create new domain entity (HTTP 201 Created)
  router.post(
    '/',
    requireTenantRole(createRoles),
    validator?.create ? validate(validator.create, 'body') : (req, res, next) => next(),
    controller.create
  );

  // PATCH /:id - Partial update of existing entity (HTTP 200 OK)
  router.patch(
    '/:id',
    requireTenantRole(updateRoles),
    validator?.params ? validate(validator.params, 'params') : (req, res, next) => next(),
    validator?.update ? validate(validator.update, 'body') : (req, res, next) => next(),
    controller.update
  );

  // DELETE /:id - Soft-delete entity (HTTP 200 OK)
  router.delete(
    '/:id',
    requireTenantRole(deleteRoles),
    validator?.params ? validate(validator.params, 'params') : (req, res, next) => next(),
    controller.delete
  );

  // POST /:id/actions/:action - Business workflow state transitions (HTTP 200 OK)
  router.post(
    '/:id/actions/:action',
    requireTenantRole(actionRoles),
    validator?.params ? validate(validator.params, 'params') : (req, res, next) => next(),
    validator?.action ? validate(validator.action, 'body') : (req, res, next) => next(),
    controller.executeAction
  );

  return router;
};

export default createCrudRouter;
