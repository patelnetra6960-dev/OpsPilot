import { Router } from 'express';
import authController from './auth.controller.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/me', requireAuth, authController.getMe);

export default router;
