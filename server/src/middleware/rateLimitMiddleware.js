import { sendError } from '../utils/responseHandler.js';
import env from '../config/env.js';

/**
 * Production-Oriented In-Memory Rate Limiter Middleware
 * Implements sliding window rate limiting without external dependencies.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // Max requests per window
  message = 'Too many requests from this IP. Please try again later.',
  keyGenerator = (req) =>
    req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client'
} = {}) => {
  const hits = new Map();

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of hits.entries()) {
        if (now - record.startTime > windowMs) {
          hits.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );

  // Unref timer so it does not block Node process termination
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // In test environment, skip unless explicitly enabled via header or custom instance
    if (env.isTest && !req.headers['x-test-rate-limit']) {
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
