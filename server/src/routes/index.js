import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import workforceRoutes from './workforce.routes.js';
import storageRoutes from './storage.routes.js';

const router = Router();

// Mount Domain Sub-Routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/workforce', workforceRoutes);
router.use('/storage', storageRoutes);

export const apiV1Router = router;
export default router;
