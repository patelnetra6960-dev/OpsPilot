import logger from '../utils/logger.js';
import { sendError } from '../utils/responseHandler.js';
import env from '../config/env.js';

export const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

export const globalErrorHandler = (err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    logger.error(`Unhandled server error on ${req.method} ${req.originalUrl}:`, err);
  } else {
    logger.warn(
      `Request rejected with ${statusCode} (${errorCode}) on ${req.method} ${req.originalUrl}: ${message}`
    );
  }

  return sendError(res, message, statusCode, errorCode, env.isProduction ? null : err.stack);
};
