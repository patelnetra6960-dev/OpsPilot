import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import workforceRoutes from './workforce.routes.js';
import customersRoutes from './customers.routes.js';
import projectsRoutes from './projects.routes.js';
import tasksRoutes from './tasks.routes.js';
import storageRoutes from './storage.routes.js';
import adminRoutes from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import auditRoutes from './audit.routes.js';
import docsRoutes from './docs.routes.js';
import serviceRequestsRoutes from './serviceRequests.routes.js';
import workOrdersRoutes from './workOrders.routes.js';
import inventoryRoutes from './inventory.routes.js';
import assetsRoutes from './assets.routes.js';
import suppliersRoutes from './suppliers.routes.js';
import expensesRoutes from './expenses.routes.js';
import invoicesRoutes from './invoices.routes.js';
import searchRoutes, { exportRouter } from './search.routes.js';
import notificationRoutes from './notification.routes.js';
import analyticsRoutes from './analytics.routes.js';
import automationRoutes from './automation.routes.js';
import shiftRoutes from './shift.routes.js';
import attendanceRoutes from './attendance.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// OpenAPI 3.0 Documentation & Swagger UI
router.use('/docs', docsRoutes);

// Mount Domain Sub-Routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/ai', aiRoutes);
router.use('/workforce', workforceRoutes);
router.use('/shifts', shiftRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/customers', customersRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/service-requests', serviceRequestsRoutes);
router.use('/services', serviceRequestsRoutes);
router.use('/work-orders', workOrdersRoutes);
router.use('/workorders', workOrdersRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/assets', assetsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/expenses', expensesRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/search', searchRoutes);
router.use('/export', exportRouter);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/automations', automationRoutes);
router.use('/audit', auditRoutes);
router.use('/storage', storageRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);

export const apiV1Router = router;
export default router;
