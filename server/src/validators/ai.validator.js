import { z } from 'zod';

export const aiQuerySchema = z.object({
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters')
    .max(500, 'Query cannot exceed 500 characters'),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional()
});

export default {
  aiQuerySchema
};
