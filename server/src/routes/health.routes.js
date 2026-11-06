import { Router } from 'express';
import healthController from '../controllers/health.controller.js';

const router = Router();

// 1. Comprehensive health check and diagnostics
router.get('/', healthController.checkHealth);

// 2. Kubernetes / ECS / Docker container liveness probe
router.get('/liveness', healthController.checkLiveness);

// 3. Database & subsystem readiness probe
router.get('/readiness', healthController.checkReadiness);

export default router;
