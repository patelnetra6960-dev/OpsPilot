import { z } from 'zod';

export const SEARCHABLE_ENTITIES = [
  'all',
  'employees',
  'customers',
  'projects',
  'tasks',
  'service_requests',
  'inventory',
  'invoices'
];

export const EXPORTABLE_ENTITIES = [
  'employees',
  'customers',
  'projects',
  'tasks',
  'service_requests',
  'inventory',
  'invoices'
];

export const globalSearchSchema = z.object({
  q: z.string().trim().optional().default(''),
  query: z.string().trim().optional(),
  type: z
    .enum(SEARCHABLE_ENTITIES)
    .optional()
    .default('all'),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional(),
  sortBy: z.string().trim().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Maximum page limit is 100').optional().default(20)
});

export const exportDataSchema = z.object({
  entity: z.enum(EXPORTABLE_ENTITIES, {
    required_error: 'Entity to export is required'
  }),
  format: z.enum(['csv', 'json']).optional().default('csv'),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional(),
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(1000, 'Maximum export record limit is 1000')
    .optional()
    .default(500)
});
