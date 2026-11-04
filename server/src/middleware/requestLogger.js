import crypto from 'crypto';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Structured Request Tracing & Logging Middleware
 * Injects a unique X-Request-Id header for end-to-end distributed tracing
 * and measures request latency.
 */
export const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    if (!env.isTest) {
      if (statusCode >= 500) {
        logger.error(`[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`);
      } else if (statusCode >= 400) {
        logger.warn(`[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`);
      } else {
        logger.info(`[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`);
      }
    }
  });

  next();
};

export default requestLogger;
