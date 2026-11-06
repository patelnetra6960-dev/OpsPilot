import logger from '../utils/logger.js';

/**
 * Deduplication & Idempotency Store
 * Prevents redundant reminder notifications and duplicate workflow runs.
 */
export class DeduplicationService {
  constructor() {
    this.store = new Map();
  }

  /**
   * Check if a reminder/action key has already been dispatched within TTL.
   * If not, records it and returns false.
   * If yes, returns true.
   *
   * @param {string} key - Unique key (e.g., "overdue_task:task-123:2026-11-06")
   * @param {number} ttlMs - Time-to-live in milliseconds (default: 24 hours)
   * @param {object} [metadata] - Optional context
   * @returns {boolean} true if duplicate, false if newly recorded
   */
  isDuplicate(key, ttlMs = 24 * 60 * 60 * 1000, metadata = {}) {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      logger.info(`[Deduplication]: Key "${key}" is still within cooldown window (${Math.round((existing.expiresAt - now) / 1000)}s remaining)`);
      return true;
    }

    this.store.set(key, {
      key,
      recordedAt: now,
      expiresAt: now + ttlMs,
      metadata
    });

    return false;
  }

  /**
   * Explicitly record a key with TTL
   */
  record(key, ttlMs = 24 * 60 * 60 * 1000, metadata = {}) {
    const now = Date.now();
    this.store.set(key, {
      key,
      recordedAt: now,
      expiresAt: now + ttlMs,
      metadata
    });
  }

  /**
   * Check if key exists without setting
   */
  has(key) {
    const now = Date.now();
    const existing = this.store.get(key);
    return Boolean(existing && existing.expiresAt > now);
  }

  /**
   * Delete a key (useful for tests or cache busting)
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all records
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get active records for monitoring
   */
  getRecentRecords(limit = 100) {
    const now = Date.now();
    const valid = [];
    for (const [key, val] of this.store.entries()) {
      if (val.expiresAt > now) {
        valid.push({ key, recordedAt: new Date(val.recordedAt).toISOString(), metadata: val.metadata });
      }
    }
    return valid.slice(-limit);
  }
}

export const deduplicationService = new DeduplicationService();
export default deduplicationService;
