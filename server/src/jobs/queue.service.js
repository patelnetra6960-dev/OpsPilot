import env from '../config/env.js';
import logger from '../utils/logger.js';
import { ReliableJobQueue } from './reliable.queue.js';

let isRedisConnected = false;
let BullMQQueue = null;
let BullMQWorker = null;
let IORedis = null;

// Dynamically check if BullMQ & Redis can be used in the current deployment environment
async function initRedisDriverIfAvailable() {
  if (!env.REDIS_URL && !env.REDIS_HOST) {
    logger.info('[QueueService] No Redis configuration supplied. Using built-in High-Reliability Queue Engine.');
    return false;
  }

  try {
    const ioredisModule = await import('ioredis');
    IORedis = ioredisModule.default || ioredisModule;

    const redisClient = new IORedis(env.REDIS_URL || {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT || 6379,
      password: env.REDIS_PASSWORD || undefined,
      connectTimeout: 1500,
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });

    await redisClient.connect();
    await redisClient.ping();
    await redisClient.disconnect();

    const bullmqModule = await import('bullmq');
    BullMQQueue = bullmqModule.Queue;
    BullMQWorker = bullmqModule.Worker;

    isRedisConnected = true;
    logger.info('[QueueService] Successfully verified Redis connectivity. BullMQ Queue Driver active.');
    return true;
  } catch (err) {
    logger.warn(`[QueueService] Redis unavailable in environment (${err.message}). Using built-in High-Reliability Queue Engine.`);
    isRedisConnected = false;
    return false;
  }
}

/**
 * Queue Service Factory & Registry
 */
export class QueueService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.driverType = 'memory';
  }

  async initialize() {
    const hasRedis = await initRedisDriverIfAvailable();
    this.driverType = hasRedis ? 'bullmq' : 'memory';
    return this.driverType;
  }

  /**
   * Get or create a named queue
   */
  getQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    if (isRedisConnected && BullMQQueue) {
      const redisConnection = {
        host: env.REDIS_HOST || '127.0.0.1',
        port: env.REDIS_PORT || 6379,
        password: env.REDIS_PASSWORD || undefined
      };
      const queue = new BullMQQueue(name, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 5000
        },
        ...options
      });
      this.queues.set(name, queue);
      logger.info(`[QueueService] BullMQ Queue "${name}" created`);
      return queue;
    }

    const queue = new ReliableJobQueue(name, options);
    this.queues.set(name, queue);
    logger.info(`[QueueService] Reliable In-Process Queue "${name}" created`);
    return queue;
  }

  /**
   * Register a worker/processor for a named queue
   */
  registerWorker(name, processor, options = {}) {
    const queue = this.getQueue(name);

    if (isRedisConnected && BullMQWorker) {
      const redisConnection = {
        host: env.REDIS_HOST || '127.0.0.1',
        port: env.REDIS_PORT || 6379,
        password: env.REDIS_PASSWORD || undefined
      };
      const worker = new BullMQWorker(name, processor, {
        connection: redisConnection,
        concurrency: options.concurrency || 5,
        ...options
      });
      this.workers.set(name, worker);
      logger.info(`[QueueService] BullMQ Worker registered for "${name}"`);
      return worker;
    }

    // ReliableJobQueue uses queue.process(processor)
    queue.process(options.concurrency || 5, processor);
    this.workers.set(name, processor);
    logger.info(`[QueueService] Worker processor registered for "${name}"`);
    return queue;
  }

  /**
   * Get queue health metrics across registered queues
   */
  async getMetrics(queueName = 'automation') {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 };
    }
    return queue.getJobCounts();
  }

  /**
   * Graceful shutdown of all queues
   */
  async closeAll() {
    for (const [name, queue] of this.queues.entries()) {
      try {
        await queue.close();
        logger.info(`[QueueService] Closed queue "${name}"`);
      } catch (err) {
        logger.error(`[QueueService] Error closing queue "${name}":`, err);
      }
    }
    this.queues.clear();
    this.workers.clear();
  }
}

export const queueService = new QueueService();
export default queueService;
