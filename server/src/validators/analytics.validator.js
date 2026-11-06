import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'year', 'all', 'custom']).optional().default('30d'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'startDate must be in YYYY-MM-DD or ISO 8601 format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'endDate must be in YYYY-MM-DD or ISO 8601 format')
    .optional()
});

export const analyticsExportQuerySchema = analyticsQuerySchema.extend({
  type: z.enum(['executive', 'manager', 'platform']).optional().default('executive'),
  format: z.enum(['csv', 'json']).optional().default('csv')
});
