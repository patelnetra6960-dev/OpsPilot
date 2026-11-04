import { Router } from 'express';
import authController from './auth.controller.js';
import { requireAuth } from '../../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/verify-email', authController.verifyEmail);
router.post('/recover-password', authController.recoverPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

// Protected Authentication Endpoints
router.get('/me', requireAuth, authController.getMe);

export default router;
