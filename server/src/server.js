import http from 'http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocketServer, closeSocketServer } from './socket/socket.server.js';
import { workflowScheduler } from './jobs/workflow.scheduler.js';
import { queueService } from './jobs/queue.service.js';

const PORT = env.PORT || 5000;
const httpServer = http.createServer(app);

// Attach Socket.IO to HTTP server
initSocketServer(httpServer);

// Start Workflow Scheduler in background if enabled
if (env.NODE_ENV !== 'test') {
  workflowScheduler.start().catch((err) => {
    logger.error('Failed to start Workflow Scheduler:', err);
  });
}

// Production Graceful Shutdown Coordinator
let isShuttingDown = false;

export const gracefulShutdown = async (signal = 'SIGTERM') => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown of OpsPilot server...`);

  // Force shutdown timeout after 10 seconds if connections refuse to close
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out (10s). Forcing termination.');
    process.exit(1);
  }, 10000);

  if (forceExitTimeout.unref) {
    forceExitTimeout.unref();
  }

  try {
    // 1. Stop background workflow scheduler
    logger.info('Stopping workflow automation scheduler...');
    workflowScheduler.stop();

    // 2. Close background job queues
    logger.info('Closing background job queues...');
    await queueService.closeAll();

    // 3. Disconnect Socket.IO clients
    logger.info('Closing Socket.IO connections...');
    closeSocketServer();

    // 4. Stop accepting new HTTP requests and close server
    await new Promise((resolve) => {
      httpServer.close((err) => {
        if (err) {
          logger.error('Error during HTTP server close:', err);
        } else {
          logger.info('HTTP server closed successfully');
        }
        resolve();
      });
    });

    logger.info('OpsPilot server shut down cleanly.');
    if (env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  } catch (err) {
    logger.error('Error encountered during graceful shutdown:', err);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Process Termination Signal Listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process Exception Safeguards
process.on('uncaughtException', (err) => {
  logger.error('FATAL: Uncaught Exception detected in Node.js process:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('FATAL: Unhandled Promise Rejection at:', { promise, reason });
});

httpServer.listen(PORT, () => {
  logger.info(`====================================================`);
  logger.info(`OpsPilot Modular Monolith API Server Started`);
  logger.info(`Port:        ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Client URL:  ${env.CLIENT_URL}`);
  logger.info(`Socket.IO:   Ready (Path: /socket.io)`);
  logger.info(`Healthcheck: http://localhost:${PORT}/api/v1/health`);
  logger.info(`Liveness:    http://localhost:${PORT}/api/v1/health/liveness`);
  logger.info(`Readiness:   http://localhost:${PORT}/api/v1/health/readiness`);
  logger.info(`Multi-Tenant Engine: Active (Header: X-Tenant-Id)`);
  logger.info(`====================================================`);
});

export { httpServer, app };
export default httpServer;
