import { Router } from 'express';
import storageController from './storage.controller.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requireTenant } from '../../middleware/tenantMiddleware.js';

const router = Router();

// All storage routes strictly require authentication and active tenant context
router.use(requireAuth);
router.use(requireTenant);

// Storage upload and signed URL operations
router.post('/upload', storageController.uploadFile);
router.post('/signed-url', storageController.createSignedUrl);

// List files in bucket for current tenant
router.get('/list/:bucket', storageController.listFiles);

// Download redirect with tenant isolation
router.get('/download/:bucket/*', storageController.downloadFile);

// Delete file with manager/admin authorization
router.delete('/:bucket/*', storageController.deleteFile);

export default router;
