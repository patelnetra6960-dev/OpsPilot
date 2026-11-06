import healthService from '../services/health.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const healthController = {
  /**
   * 1. Comprehensive System Health Handler
   */
  checkHealth: asyncHandler(async (_req, res) => {
    const health = await healthService.getSystemHealth();
    return sendSuccess(res, health, 'OpsPilot Backend is operational', 200);
  }),

  /**
   * 2. Lightweight Liveness Probe
   */
  checkLiveness: asyncHandler(async (_req, res) => {
    const liveness = healthService.getLiveness();
    return sendSuccess(res, liveness, 'Service is alive', 200);
  }),

  /**
   * 3. Deep Readiness Probe (Database connectivity verification)
   */
  checkReadiness: asyncHandler(async (_req, res) => {
    const readiness = await healthService.getReadiness();
    if (!readiness.ready) {
      return sendError(res, 'Service not ready: Database check failed', 503, 'SERVICE_UNAVAILABLE', readiness);
    }
    return sendSuccess(res, readiness, 'Service is ready to accept traffic', 200);
  })
};

export default healthController;
