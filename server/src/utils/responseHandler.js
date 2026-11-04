/**
 * Standardized API Response Utilities
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};

export const sendError = (res, message = 'An error occurred', statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  return res.status(statusCode).json(response);
};
