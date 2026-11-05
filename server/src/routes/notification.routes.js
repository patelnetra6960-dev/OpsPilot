import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import {
  notificationQuerySchema,
  markReadParamSchema
} from '../validators/notification.validator.js';

const router = Router();

// Strict Authentication and Tenant Isolation boundary
router.use(requireAuth);
router.use(requireTenant);

// Collection operations
router.get('/', validate(notificationQuerySchema, 'query'), notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/mark-all-read', notificationController.markAllAsRead);

// Entity operations
router.patch('/:id/read', validate(markReadParamSchema, 'params'), notificationController.markAsRead);
router.delete('/:id', validate(markReadParamSchema, 'params'), notificationController.deleteNotification);

export default router;
