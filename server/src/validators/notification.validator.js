import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  is_read: z
    .enum(['true', 'false'])
    .optional(),
  type: z
    .enum(['info', 'success', 'warning', 'error', 'dispatch', 'alert'])
    .optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const markReadParamSchema = z.object({
  id: z.string().min(1, 'Notification ID is required')
});
