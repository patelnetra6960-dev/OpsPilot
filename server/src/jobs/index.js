import logger from '../utils/logger.js';

/**
 * Background Job Runner Foundation for OpsPilot
 * Manages recurring cron tasks, SLA breach monitors, and log archiving.
 */
export class JobRunner {
  constructor() {
    this.jobs = new Map();
    this.running = false;
  }

  /**
   * Register a scheduled recurring job
   */
  registerJob(jobName, intervalMs, taskFunction) {
    this.jobs.set(jobName, {
      intervalMs,
      taskFunction,
      timerId: null,
      lastRun: null,
      runCount: 0
    });
    logger.info(`Job registered: ${jobName} (interval: ${intervalMs}ms)`);
  }

  /**
   * Start all registered background jobs
   */
  start() {
    if (this.running) return;
    this.running = true;

    for (const [name, job] of this.jobs.entries()) {
      job.timerId = setInterval(async () => {
        try {
          job.lastRun = new Date().toISOString();
          job.runCount++;
          await job.taskFunction();
        } catch (err) {
          logger.error(`Error executing background job '${name}':`, err);
        }
      }, job.intervalMs);

      // Unref timer so it does not prevent graceful process termination
      if (job.timerId.unref) {
        job.timerId.unref();
      }
    }

    logger.info('Background Job Runner started');
  }

  /**
   * Stop all running background jobs
   */
  stop() {
    if (!this.running) return;
    for (const job of this.jobs.values()) {
      if (job.timerId) {
        clearInterval(job.timerId);
        job.timerId = null;
      }
    }
    this.running = false;
    logger.info('Background Job Runner stopped');
  }
}

export const jobRunner = new JobRunner();
export default jobRunner;
