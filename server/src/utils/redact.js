/**
 * Sensitive Data Redaction Utility
 * Ensures credentials, tokens, API keys, and PII are never leaked in logs, errors, or audit trails.
 */

const SENSITIVE_KEY_REGEX =
  /password|token|secret|authorization|service_role|apikey|api_key|access_token|refresh_token|credit_card|card_number|cvv|ssn|cookie/i;

const JWT_BEARER_REGEX = /^Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

/**
 * Recursively deep-redacts sensitive keys and values from objects, arrays, and strings.
 * @param {unknown} data - Input data to redact
 * @param {number} [depth=0] - Recursion depth limit
 * @param {WeakSet} [seen] - Visited objects set to prevent circular reference cycles
 * @returns {unknown} Redacted clone
 */
export const redactSensitive = (data, depth = 0, seen = new WeakSet()) => {
  if (depth > 8) return '[MAX_DEPTH_REACHED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (JWT_BEARER_REGEX.test(data.trim())) {
      return 'Bearer [REDACTED_JWT]';
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (seen.has(data)) {
    return '[CIRCULAR_REF]';
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item, depth + 1, seen));
  }

  // Handle standard Error objects
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      code: data.code,
      status: data.status || data.statusCode,
      stack: process.env.NODE_ENV === 'production' ? undefined : data.stack
    };
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = redactSensitive(value, depth + 1, seen);
    }
  }

  return clean;
};

export default redactSensitive;
