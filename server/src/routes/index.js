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

const router = Router();

// OpenAPI 3.0 Documentation & Swagger UI
router.use('/docs', docsRoutes);

// Mount Domain Sub-Routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/workforce', workforceRoutes);
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
router.use('/audit', auditRoutes);
router.use('/storage', storageRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);

export const apiV1Router = router;
export default router;
