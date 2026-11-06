import aiAssistantService from '../services/aiAssistant.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const aiController = {
  /**
   * Process Natural Language Business Query
   */
  query: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!orgId) {
      return sendError(res, 'Tenant context required for AI query', 400, 'TENANT_REQUIRED');
    }

    const { query, conversationId, context } = req.body;

    const result = await aiAssistantService.processQuery({
      query,
      organizationId: orgId,
      user: req.user,
      context: {
        ...(context || {}),
        conversationId,
        organizationName: req.tenant?.name
      }
    });

    return sendSuccess(res, result, 'AI assistant response generated successfully');
  }),

  /**
   * Retrieve AI Assistant Usage Telemetry & Audit Logs
   */
  getUsage: asyncHandler(async (req, res) => {
    const orgId = req.tenant?.id || req.headers['x-tenant-id'];
    if (!orgId) {
      return sendError(res, 'Tenant context required', 400, 'TENANT_REQUIRED');
    }

    const usage = await aiAssistantService.getUsage(orgId);
    return sendSuccess(res, usage, 'AI assistant usage telemetry retrieved');
  }),

  /**
   * Retrieve Standard Prompt Suggestions
   */
  getSuggestions: asyncHandler(async (_req, res) => {
    const suggestions = aiAssistantService.getSuggestions();
    return sendSuccess(res, suggestions, 'AI prompt suggestions retrieved');
  })
};

export default aiController;
