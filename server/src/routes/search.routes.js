import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import { globalSearchSchema, exportDataSchema } from '../validators/search.validator.js';

const router = Router();

// Strict Authentication and Tenant Isolation boundary
router.use(requireAuth);
router.use(requireTenant);

// 1. Unified Global Search
router.get('/', validate(globalSearchSchema, 'query'), searchController.search);

// 2. Permission-Aware Data Export
router.get('/export', validate(exportDataSchema, 'query'), searchController.exportData);
router.post('/export', validate(exportDataSchema, 'body'), searchController.exportData);

// Dedicated standalone export router for /export mounting
export const exportRouter = Router();
exportRouter.use(requireAuth);
exportRouter.use(requireTenant);
exportRouter.get('/', validate(exportDataSchema, 'query'), searchController.exportData);
exportRouter.post('/', validate(exportDataSchema, 'body'), searchController.exportData);

export default router;
