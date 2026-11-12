import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Endpoints with Zod schema validation and brute-force rate limiting
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/verify-email', authRateLimiter, authController.verifyEmail);
router.post('/recover-password', authRateLimiter, validate(recoverPasswordSchema), authController.recoverPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// Protected Authentication Endpoints (governed by global defaultRateLimiter)
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);

export default router;
