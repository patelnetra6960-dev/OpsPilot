/**
 * Standardized API Response Utilities
 * Enforces uniform JSON response envelope across the entire OpsPilot platform.
 */

export const sendSuccess = (
  res,
  data = null,
  message = 'Success',
  statusCode = 200,
  extraMeta = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(res.req?.id && { requestId: res.req.id }),
      ...extraMeta
    }
  });
};

export const sendPaginated = (
  res,
  data = [],
  pagination = {},
  message = 'Data retrieved successfully',
  statusCode = 200,
  extraMeta = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || data.length,
      total: pagination.total ?? data.length,
      totalPages:
        pagination.totalPages ||
        Math.ceil((pagination.total || data.length) / (pagination.limit || 1)),
      hasNextPage: Boolean(pagination.hasNextPage),
      hasPrevPage: Boolean(pagination.hasPrevPage)
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(res.req?.id && { requestId: res.req.id }),
      ...extraMeta
    }
  });
};

export const sendError = (
  res,
  message = 'An error occurred',
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
  details = null,
  extraMeta = {}
) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(res.req?.id && { requestId: res.req.id }),
      ...extraMeta
    }
  };
  return res.status(statusCode).json(response);
};

export default {
  sendSuccess,
  sendPaginated,
  sendError
};
