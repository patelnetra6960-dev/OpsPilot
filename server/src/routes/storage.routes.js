import { Router } from 'express';
import storageController from '../controllers/storage.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { uploadFileSchema, signedUrlSchema } from '../validators/storage.validator.js';

const router = Router();

// All storage routes strictly require authentication and active tenant context
router.use(requireAuth);
router.use(requireTenant);

// Storage upload and signed URL operations with schema validation
router.post('/upload', validate(uploadFileSchema), storageController.uploadFile);
router.post('/signed-url', validate(signedUrlSchema), storageController.createSignedUrl);

// List files in bucket for current tenant
router.get('/list/:bucket', storageController.listFiles);

// Download redirect with tenant isolation
router.get('/download/:bucket/*', storageController.downloadFile);

// Delete file with manager/admin authorization
router.delete('/:bucket/*', storageController.deleteFile);

export default router;
