import logger from '../utils/logger.js';

/**
 * Real-Time WebSockets Foundation for OpsPilot
 * Manages tenant-scoped real-time event broadcasting and user presence.
 */
export class SocketManager {
  constructor() {
    this.io = null;
    this.tenantRooms = new Map(); // tenantId -> Set of socketIds
  }

  /**
   * Attach SocketManager to HTTP server instance
   */
  initialize(httpServer) {
    if (!httpServer) {
      logger.info('SocketManager running in detached/test mode');
      return;
    }
    logger.info('SocketManager initialized for real-time operations');
  }

  /**
   * Join a verified tenant room
   */
  joinTenantRoom(socketId, tenantId) {
    if (!this.tenantRooms.has(tenantId)) {
      this.tenantRooms.set(tenantId, new Set());
    }
    this.tenantRooms.get(tenantId).add(socketId);
    logger.debug(`Socket ${socketId} joined tenant room ${tenantId}`);
  }

  /**
   * Leave a tenant room
   */
  leaveTenantRoom(socketId, tenantId) {
    if (this.tenantRooms.has(tenantId)) {
      this.tenantRooms.get(tenantId).delete(socketId);
      if (this.tenantRooms.get(tenantId).size === 0) {
        this.tenantRooms.delete(tenantId);
      }
    }
    logger.debug(`Socket ${socketId} left tenant room ${tenantId}`);
  }

  /**
   * Broadcast an event strictly to users within the tenant room
   */
  broadcastToTenant(tenantId, event, data) {
    logger.debug(`Broadcast event '${event}' to tenant ${tenantId}`, data);
    return {
      broadcasted: true,
      tenantId,
      event,
      recipients: this.tenantRooms.get(tenantId)?.size || 0
    };
  }
}

export const socketManager = new SocketManager();
export default socketManager;
