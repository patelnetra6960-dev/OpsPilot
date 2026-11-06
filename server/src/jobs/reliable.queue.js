import { EventEmitter } from 'events';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Standard Job Model compliant with BullMQ job contract
 */
export class Job {
  constructor(queue, id, name, data = {}, opts = {}) {
    this.queue = queue;
    this.id = id || opts.jobId || crypto.randomUUID();
    this.name = name;
    this.data = data;
    this.opts = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      delay: 0,
      timeout: 30000,
      removeOnComplete: false,
      removeOnFail: false,
      ...opts
    };
    this.status = 'waiting'; // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    this.progress = 0;
    this.returnvalue = null;
    this.failedReason = null;
    this.stacktrace = [];
    this.attemptsMade = 0;
    this.createdAt = new Date().toISOString();
    this.processedOn = null;
    this.finishedOn = null;
  }

  updateProgress(value) {
    this.progress = Math.min(100, Math.max(0, Number(value)));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      data: this.data,
      opts: this.opts,
      status: this.status,
      progress: this.progress,
      returnvalue: this.returnvalue,
      failedReason: this.failedReason,
      attemptsMade: this.attemptsMade,
      createdAt: this.createdAt,
      processedOn: this.processedOn,
      finishedOn: this.finishedOn
    };
  }
}

/**
 * High-Reliability Job Queue Engine
 * Provides guaranteed in-process background processing, retry with backoff,
 * dead-letter tracking, idempotency, and job lifecycle telemetry.
 */
export class ReliableJobQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.concurrency = options.concurrency || 5;
    this.jobs = new Map();
    this.waiting = [];
    this.active = [];
    this.completed = [];
    this.failed = [];
    this.delayedTimers = new Map();
    this.processor = null;
    this.isPaused = false;
    this.isClosing = false;
  }

  /**
   * Enqueue a job with idempotency, delay, and retry options
   */
  async add(name, data = {}, opts = {}) {
    const jobId = opts.jobId;

    // Idempotency Enforcement: Prevent duplicate active/waiting/delayed job instances
    if (jobId && this.jobs.has(jobId)) {
      const existingJob = this.jobs.get(jobId);
      if (['waiting', 'active', 'delayed'].includes(existingJob.status)) {
        logger.info(`[JobQueue:${this.name}] Idempotency hit: Job ${jobId} already ${existingJob.status}. Reusing existing.`);
        return existingJob;
      }
      // If completed recently (within deduplicateWindowMs), suppress re-execution
      if (existingJob.status === 'completed' && opts.deduplicateWindowMs) {
        const timeSinceDone = Date.now() - new Date(existingJob.finishedOn).getTime();
        if (timeSinceDone < opts.deduplicateWindowMs) {
          logger.info(`[JobQueue:${this.name}] Idempotency hit: Job ${jobId} completed ${timeSinceDone}ms ago (within cooldown).`);
          return existingJob;
        }
      }
    }

    const job = new Job(this, jobId, name, data, opts);
    this.jobs.set(job.id, job);

    if (job.opts.delay > 0) {
      job.status = 'delayed';
      const timer = setTimeout(() => {
        this.delayedTimers.delete(job.id);
        if (this.jobs.has(job.id) && job.status === 'delayed') {
          job.status = 'waiting';
          this.waiting.push(job.id);
          this.emit('waiting', job);
          this._processNext();
        }
      }, job.opts.delay);
      this.delayedTimers.set(job.id, timer);
      this.emit('delayed', job);
      return job;
    }

    job.status = 'waiting';
    this.waiting.push(job.id);
    this.emit('waiting', job);

    // Trigger processing asynchronously (never blocks caller)
    setTimeout(() => this._processNext(), 0);

    return job;
  }

  /**
   * Register worker processing function
   */
  process(concurrencyOrHandler, maybeHandler) {
    if (typeof concurrencyOrHandler === 'function') {
      this.processor = concurrencyOrHandler;
    } else {
      if (typeof concurrencyOrHandler === 'number') {
        this.concurrency = concurrencyOrHandler;
      }
      this.processor = maybeHandler;
    }

    setTimeout(() => this._processNext(), 0);
    return this;
  }

  /**
   * Internal queue worker loop
   */
  async _processNext() {
    if (this.isPaused || this.isClosing || !this.processor) {
      return;
    }

    if (this.active.length >= this.concurrency || this.waiting.length === 0) {
      return;
    }

    const jobId = this.waiting.shift();
    const job = this.jobs.get(jobId);

    if (!job) {
      return this._processNext();
    }

    job.status = 'active';
    job.processedOn = new Date().toISOString();
    this.active.push(job.id);
    this.emit('active', job);

    // Execute job asynchronously with error and retry handling
    (async () => {
      let timeoutTimer = null;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutTimer = setTimeout(
            () => reject(new Error(`Job ${job.id} timed out after ${job.opts.timeout}ms`)),
            job.opts.timeout
          );
        });

        const executionPromise = this.processor(job);
        const result = await Promise.race([executionPromise, timeoutPromise]);
        if (timeoutTimer) clearTimeout(timeoutTimer);

        // Success transition
        this._removeFromList(this.active, job.id);
        job.status = 'completed';
        job.returnvalue = result;
        job.finishedOn = new Date().toISOString();
        this.completed.push(job.id);

        this.emit('completed', job, result);
        logger.info(`[JobQueue:${this.name}] Job ${job.id} (${job.name}) completed successfully`);
      } catch (err) {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        this._removeFromList(this.active, job.id);
        job.attemptsMade += 1;
        job.failedReason = err?.message || String(err);
        job.stacktrace.push(err?.stack || String(err));

        const maxAttempts = job.opts.attempts || 1;

        if (job.attemptsMade < maxAttempts) {
          // Retry with Exponential Backoff
          const baseDelay = job.opts.backoff?.delay || 1000;
          const retryDelay = job.opts.backoff?.type === 'exponential'
            ? baseDelay * Math.pow(2, job.attemptsMade - 1)
            : baseDelay;

          job.status = 'delayed';
          logger.warn(`[JobQueue:${this.name}] Job ${job.id} failed attempt ${job.attemptsMade}/${maxAttempts} (${err.message}). Retrying in ${retryDelay}ms...`);
          this.emit('retrying', job, err);

          const timer = setTimeout(() => {
            this.delayedTimers.delete(job.id);
            if (this.jobs.has(job.id) && job.status === 'delayed') {
              job.status = 'waiting';
              this.waiting.push(job.id);
              this.emit('waiting', job);
              this._processNext();
            }
          }, retryDelay);

          this.delayedTimers.set(job.id, timer);
        } else {
          // Max attempts exhausted: Move to Dead Letter Failed Queue
          job.status = 'failed';
          job.finishedOn = new Date().toISOString();
          this.failed.push(job.id);
          logger.error(`[JobQueue:${this.name}] Job ${job.id} permanently failed after ${job.attemptsMade} attempts: ${err.message}`);
          this.emit('failed', job, err);
        }
      } finally {
        setTimeout(() => this._processNext(), 0);
      }
    })();

    // Attempt to dequeue next available job up to concurrency limit
    if (this.active.length < this.concurrency && this.waiting.length > 0) {
      setTimeout(() => this._processNext(), 0);
    }
  }

  /**
   * Remove job ID from internal tracker array
   */
  _removeFromList(list, id) {
    const idx = list.indexOf(id);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  /**
   * Retrieve a specific job by ID
   */
  async getJob(id) {
    return this.jobs.get(id) || null;
  }

  /**
   * Retrieve jobs by status
   */
  async getJobs(types = ['waiting', 'active', 'completed', 'failed', 'delayed'], start = 0, end = -1) {
    const matching = [];
    for (const job of this.jobs.values()) {
      if (types.includes(job.status)) {
        matching.push(job);
      }
    }
    // Sort descending by creation date
    matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const sliceEnd = end === -1 ? matching.length : end;
    return matching.slice(start, sliceEnd);
  }

  /**
   * Get queue health counts
   */
  async getJobCounts() {
    return {
      waiting: this.waiting.length,
      active: this.active.length,
      completed: this.completed.length,
      failed: this.failed.length,
      delayed: this.delayedTimers.size,
      total: this.jobs.size
    };
  }

  /**
   * Manually retry a failed job
   */
  async retryJob(id) {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    this._removeFromList(this.failed, id);
    this._removeFromList(this.active, id);

    job.status = 'waiting';
    job.failedReason = null;
    job.attemptsMade = 0;
    this.waiting.push(job.id);

    this.emit('waiting', job);
    setTimeout(() => this._processNext(), 0);

    logger.info(`[JobQueue:${this.name}] Failed job ${id} manually requeued for execution`);
    return job;
  }

  /**
   * Pause queue dequeueing
   */
  pause() {
    this.isPaused = true;
    logger.info(`[JobQueue:${this.name}] Queue paused`);
  }

  /**
   * Resume queue dequeueing
   */
  resume() {
    this.isPaused = false;
    logger.info(`[JobQueue:${this.name}] Queue resumed`);
    setTimeout(() => this._processNext(), 0);
  }

  /**
   * Purge old completed or failed jobs
   */
  async clean(gracePeriodMs = 24 * 60 * 60 * 1000, limit = 100, type = 'completed') {
    const cutoff = Date.now() - gracePeriodMs;
    const targetList = type === 'completed' ? this.completed : this.failed;
    const toRemove = [];

    for (const id of targetList) {
      const job = this.jobs.get(id);
      if (job && new Date(job.finishedOn).getTime() < cutoff) {
        toRemove.push(id);
        if (toRemove.length >= limit) break;
      }
    }

    for (const id of toRemove) {
      this._removeFromList(targetList, id);
      this.jobs.delete(id);
    }

    return toRemove;
  }

  /**
   * Graceful queue shutdown
   */
  async close() {
    this.isClosing = true;
    this.isPaused = true;
    for (const timer of this.delayedTimers.values()) {
      clearTimeout(timer);
    }
    this.delayedTimers.clear();
    logger.info(`[JobQueue:${this.name}] Queue closed gracefully`);
  }
}
