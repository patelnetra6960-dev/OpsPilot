import { Router } from 'express';
import { requireAuth, requireManagerOrAdmin } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { updateAutomationConfigSchema, triggerWorkflowSchema } from '../validators/automation.validator.js';
import { automationController } from '../controllers/automation.controller.js';

const router = Router();

// All automation endpoints require authenticated user, tenant context, and manager+ role
router.use(requireAuth, requireTenant, requireManagerOrAdmin);

// 1. Get Automation Configuration
router.get('/config', (req, res, next) => automationController.getAutomationConfig(req, res, next));

// 2. Update Automation Configuration
router.put(
  '/config',
  validate(updateAutomationConfigSchema, 'body'),
  (req, res, next) => automationController.updateAutomationConfig(req, res, next)
);

// 3. Trigger Immediate Background Workflow Execution (Asynchronous HTTP 202)
router.post(
  '/trigger',
  validate(triggerWorkflowSchema, 'body'),
  (req, res, next) => automationController.triggerWorkflow(req, res, next)
);

// 4. Background Queue Health & Metrics
router.get('/queue/metrics', (req, res, next) => automationController.getQueueMetrics(req, res, next));

// 5. Job Execution History
router.get('/queue/jobs', (req, res, next) => automationController.getJobHistory(req, res, next));

// 6. Retry Failed Job
router.post('/queue/jobs/:id/retry', (req, res, next) => automationController.retryFailedJob(req, res, next));

// 7. Deduplication Records
router.get('/deduplication', (req, res, next) => automationController.getRecentDeduplication(req, res, next));

export default router;
