import redactSensitive from './redact.js';
import env from '../config/env.js';

/**
 * Enterprise Structured Logger
 * Formats log entries with ISO timestamps, correlation IDs, log levels,
 * and automatic redaction of sensitive credentials.
 */

const formatLog = (level, message, meta = {}, error = null) => {
  const timestamp = new Date().toISOString();
  const correlationId = meta?.requestId || meta?.correlationId || undefined;
  const sanitizedMeta = redactSensitive(meta);
  const sanitizedError = error ? redactSensitive(error) : undefined;

  const logPayload = {
    timestamp,
    level,
    message,
    ...(correlationId && { correlationId }),
    ...(Object.keys(sanitizedMeta).length > 0 && { meta: sanitizedMeta }),
    ...(sanitizedError && { error: sanitizedError })
  };

  // Structured JSON output for production environments or when requested
  if (env.isProduction || process.env.STRUCTURED_LOGS === 'true') {
    return JSON.stringify(logPayload);
  }

  // Human-readable formatted string for local development
  const prefix = `[${level}] [${timestamp}]${correlationId ? ` [${correlationId}]` : ''}`;
  const metaStr = Object.keys(sanitizedMeta).length ? ` ${JSON.stringify(sanitizedMeta)}` : '';
  const errStr = error ? `\n${error.stack || error}` : '';
  return `${prefix} ${message}${metaStr}${errStr}`;
};

export const logger = {
  info: (message, meta = {}) => {
    console.log(formatLog('INFO', message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatLog('WARN', message, meta));
  },
  error: (message, error = null, meta = {}) => {
    console.error(formatLog('ERROR', message, meta, error));
  },
  debug: (message, meta = {}) => {
    if (!env.isProduction && !env.isTest) {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
  /**
   * Dedicated Security Event Logger
   * Logs authentication, authorization, tamper attempts, and boundary violations
   */
  security: (eventType, details = {}) => {
    const message = `[SECURITY_EVENT] ${eventType}`;
    console.warn(formatLog('WARN', message, { eventType, ...details }));
  }
};

export default logger;
