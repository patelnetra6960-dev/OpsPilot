import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import workforceRoutes from './workforce.routes.js';
import customersRoutes from './customers.routes.js';
import storageRoutes from './storage.routes.js';
import adminRoutes from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import auditRoutes from './audit.routes.js';
import docsRoutes from './docs.routes.js';

const router = Router();

// OpenAPI 3.0 Documentation & Swagger UI
router.use('/docs', docsRoutes);

// Mount Domain Sub-Routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/workforce', workforceRoutes);
router.use('/customers', customersRoutes);
router.use('/audit', auditRoutes);
router.use('/storage', storageRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);

export const apiV1Router = router;
export default router;
