import http from 'http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocketServer } from './socket/socket.server.js';

const PORT = env.PORT || 5000;
const httpServer = http.createServer(app);

// Attach Socket.IO to HTTP server
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`====================================================`);
  logger.info(`OpsPilot Modular Monolith API Server Started`);
  logger.info(`Port:        ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Client URL:  ${env.CLIENT_URL}`);
  logger.info(`Socket.IO:   Ready (Path: /socket.io)`);
  logger.info(`Healthcheck: http://localhost:${PORT}/api/health`);
  logger.info(`Multi-Tenant Engine: Active (Header: X-Tenant-Id)`);
  logger.info(`====================================================`);
});

export { httpServer, app };
export default httpServer;
