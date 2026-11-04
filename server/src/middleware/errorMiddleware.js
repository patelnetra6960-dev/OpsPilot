import logger from '../utils/logger.js';
import { sendError } from '../utils/responseHandler.js';
import { handleSupabaseError } from '../utils/supabaseHelpers.js';
import redactSensitive from '../utils/redact.js';
import env from '../config/env.js';

export const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

/**
 * Enterprise Centralized Exception Handler
 * Intercepts all synchronous and asynchronous errors, translates database exceptions,
 * redacts sensitive information, and enforces uniform error envelopes.
 */
export const globalErrorHandler = (err, req, res, _next) => {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let details = err.details || null;

  // Handle raw PostgreSQL / Supabase PostgREST error codes
  if (
    typeof err.code === 'string' &&
    (/^(23|42|22|PGRST)/.test(err.code) || err.code.length === 5)
  ) {
    const dbError = handleSupabaseError(err);
    statusCode = dbError.status;
    message = dbError.message;
    errorCode = dbError.code;
    details = env.isProduction ? null : dbError.details;
  }

  // Redact any sensitive information from error details
  if (details) {
    details = redactSensitive(details);
  }

  const correlationId = req.id || req.correlationId;
  const logContext = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    userId: req.user?.id,
    tenantId: req.tenant?.id
  };

  if (statusCode >= 500) {
    logger.error(
      `Unhandled server error on ${req.method} ${req.originalUrl}: ${message}`,
      err,
      logContext
    );
  } else if (
    errorCode === 'FORBIDDEN_CROSS_TENANT_ACCESS' ||
    errorCode === 'FORBIDDEN_PRIVILEGE_ESCALATION'
  ) {
    logger.security(errorCode, { message, ...logContext });
  } else {
    logger.warn(
      `Request rejected with ${statusCode} (${errorCode}) on ${req.method} ${req.originalUrl}: ${message}`,
      logContext
    );
  }

  return sendError(
    res,
    message,
    statusCode,
    errorCode,
    env.isProduction ? null : details || (statusCode >= 500 ? err.stack : null),
    { correlationId }
  );
};

export default {
  notFoundHandler,
  globalErrorHandler
};
