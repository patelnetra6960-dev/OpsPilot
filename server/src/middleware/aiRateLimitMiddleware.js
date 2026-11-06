import { sendError } from '../utils/responseHandler.js';

// In-memory sliding window rate limiter
const rateLimitMap = new Map();

/**
 * AI Assistant Rate Limiter Middleware
 * Restricts query volume to max 30 requests per minute per tenant/user.
 */
export const aiRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.max || 30; // 30 requests per minute

  return (req, res, next) => {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 'anonymous-tenant';
    const userId = req.user?.id || req.ip || 'anonymous-user';
    const key = `ai_rate_${tenantId}_${userId}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);

    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      rateLimitMap.set(key, record);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return sendError(
        res,
        `AI query rate limit exceeded. You have made ${record.count} requests in 60s. Maximum allowed is ${maxRequests} requests per minute.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfterSeconds: retryAfterSec }
      );
    }

    next();
  };
};

export const clearAIRateLimits = () => {
  rateLimitMap.clear();
};

aiRateLimiter.clear = clearAIRateLimits;
aiRateLimiter.record = (key) => {
  const record = rateLimitMap.get(key) || { count: 0, startTime: Date.now() };
  record.count += 1;
  rateLimitMap.set(key, record);
};

export default aiRateLimiter;
