import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import { requireAuth, requireTenantRole } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimitMiddleware.js';
import { aiQuerySchema } from '../validators/ai.validator.js';

const router = Router();

// All AI assistant routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenant);

// Only authorized managers (owner, admin, manager) can query business analytics
router.use(requireTenantRole(['owner', 'admin', 'manager']));

// Standard suggestions
router.get('/suggestions', aiController.getSuggestions);

// AI Usage & Telemetry
router.get('/usage', aiController.getUsage);

// Natural Language Query Execution (Protected by rate limiting & validation)
router.post(
  '/query',
  aiRateLimiter({ max: 30, windowMs: 60 * 1000 }),
  validate(aiQuerySchema),
  aiController.query
);

export default router;
