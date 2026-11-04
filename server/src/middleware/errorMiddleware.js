import logger from '../utils/logger.js';
import { sendError } from '../utils/responseHandler.js';
import env from '../config/env.js';

export const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

export const globalErrorHandler = (err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  return sendError(
    res,
    message,
    statusCode,
    errorCode,
    env.isProduction ? null : err.stack
  );
};
