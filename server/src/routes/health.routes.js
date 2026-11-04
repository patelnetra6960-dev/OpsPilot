import { Router } from 'express';
import healthController from '../controllers/health.controller.js';

const router = Router();

// Public health check and diagnostics endpoint
router.get('/', healthController.checkHealth);

export default router;
