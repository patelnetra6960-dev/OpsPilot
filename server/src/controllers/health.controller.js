import healthService from '../services/health.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const healthController = {
  /**
   * Health Check Handler
   */
  checkHealth: asyncHandler(async (_req, res) => {
    const health = await healthService.getSystemHealth();
    return sendSuccess(res, health, 'OpsPilot Backend is operational', 200);
  })
};

export default healthController;
