import { z } from 'zod';
import { paginationQuerySchema } from './base.validator.js';

export const auditQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().optional(),
  entity_type: z.string().trim().optional(),
  user_id: z.string().trim().optional()
});

export default {
  auditQuerySchema
};
