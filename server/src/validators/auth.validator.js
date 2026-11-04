import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  organization_name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .optional(),
  subscription_tier: z.enum(['starter', 'growth', 'enterprise']).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required')
});

export const recoverPasswordSchema = z.object({
  email: z.string().email('Valid email address is required')
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

export default {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema
};
