import crypto from 'crypto';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Structured Request Tracing & Correlation Middleware
 * Injects and propagates unique correlation IDs (X-Request-Id & X-Correlation-Id)
 * for end-to-end distributed tracing across microservices, gateways, and logs.
 */
export const requestLogger = (req, res, next) => {
  const correlationId =
    req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID();

  req.id = correlationId;
  req.correlationId = correlationId;

  // Echo correlation IDs back in response headers
  res.setHeader('X-Request-Id', correlationId);
  res.setHeader('X-Correlation-Id', correlationId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    const logMeta = {
      requestId: correlationId,
      correlationId,
      method,
      url,
      statusCode,
      durationMs: duration,
      ip: req.ip || req.socket?.remoteAddress,
      tenantId: req.tenant?.id || req.headers['x-tenant-id'] || undefined,
      userId: req.user?.id || undefined
    };

    if (!env.isTest) {
      if (statusCode >= 500) {
        logger.error(`HTTP ${method} ${url} ${statusCode} - ${duration}ms`, null, logMeta);
      } else if (statusCode >= 400) {
        logger.warn(`HTTP ${method} ${url} ${statusCode} - ${duration}ms`, logMeta);
      } else {
        logger.info(`HTTP ${method} ${url} ${statusCode} - ${duration}ms`, logMeta);
      }
    }
  });

  next();
};

export default requestLogger;
