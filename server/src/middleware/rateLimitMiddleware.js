import { sendError } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Production-Oriented Sliding Window Rate Limiter
 * Provides DDoS, brute-force, and abusive traffic protection with custom window,
 * standard RateLimit headers, and security event logging.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // Max requests per window
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) =>
    req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client',
  enableInTest = false
} = {}) => {
  const hits = new Map();

  // Periodic cleanup of expired rate limit windows
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of hits.entries()) {
        if (now - record.startTime > windowMs) {
          hits.delete(key);
        }
      }
    },
    Math.min(windowMs, 5 * 60 * 1000)
  );

  // Unref timer so it does not keep process open
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // In test environment, skip unless explicitly enabled or triggered via test header
    if (env.isTest && !enableInTest && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    const resetTime = Math.ceil((record.startTime + windowMs - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetTime);

    if (record.count > max) {
      res.setHeader('Retry-After', resetTime);

      logger.security('RATE_LIMIT_EXCEEDED', {
        key,
        limit: max,
        count: record.count,
        url: req.originalUrl,
        ip: req.ip
      });

      return sendError(res, message, 429, 'TOO_MANY_REQUESTS', {
        limit: max,
        remaining: 0,
        retryAfterSeconds: resetTime
      });
    }

    next();
  };
};

export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please wait before retrying.'
});

export default {
  createRateLimiter,
  defaultRateLimiter,
  authRateLimiter
};
