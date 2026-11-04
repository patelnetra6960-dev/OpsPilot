import { z } from 'zod';

export const auditFilterSchema = z.object({
  action: z.string().optional(),
  actor_id: z.string().uuid('Invalid user UUID').optional().or(z.literal('')),
  resource_type: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25)
});
