import auditService from '../services/audit.service.js';
import { sendPaginated, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const organizationId = req.tenant.id;
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    action,
    entity_type,
    user_id,
    from_date,
    to_date
  } = req.query || {};

  const queryOptions = {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
    sortBy: sortBy || 'created_at',
    sortOrder: sortOrder || 'desc',
    search,
    from_date,
    to_date,
    filters: {
      ...(action && { action }),
      ...(entity_type && { entity_type }),
      ...(user_id && { user_id })
    }
  };

  const context = {
    user: req.user,
    membership: req.membership,
    userToken: req.token
  };

  const result = await auditService.getOrganizationAuditLogs(organizationId, queryOptions, context);

  return sendPaginated(
    res,
    result.data,
    result.pagination,
    'Organization audit logs retrieved successfully',
    200
  );
});

export const rejectAuditMutation = (req, res) => {
  return sendError(
    res,
    'Method Not Allowed: Audit records are permanently immutable and cannot be created, updated, or deleted via this endpoint.',
    405,
    'METHOD_NOT_ALLOWED'
  );
};

export default {
  listAuditLogs,
  rejectAuditMutation
};
