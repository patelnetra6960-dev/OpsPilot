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

// Apply auth rate limiter to authentication endpoints
router.use(authRateLimiter);

// Public Authentication Endpoints with Zod schema validation
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/verify-email', authController.verifyEmail);
router.post('/recover-password', validate(recoverPasswordSchema), authController.recoverPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// Protected Authentication Endpoints
router.get('/me', requireAuth, authController.getMe);

export default router;
