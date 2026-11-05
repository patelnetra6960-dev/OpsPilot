import { z } from 'zod';

export const SEARCHABLE_ENTITIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'employees', label: 'Employees' },
  { value: 'customers', label: 'Customers' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'service_requests', label: 'Service Requests' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'invoices', label: 'Invoices' }
];

export const EXPORTABLE_ENTITIES = [
  { value: 'employees', label: 'Employees / Workforce' },
  { value: 'customers', label: 'Customers / Clients' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'service_requests', label: 'Service Requests' },
  { value: 'inventory', label: 'Inventory Items' },
  { value: 'invoices', label: 'Invoices & Billing' }
];

export const searchFilterSchema = z.object({
  q: z.string().trim().optional(),
  type: z.string().optional().default('all'),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  from_date: z.string().trim().optional(),
  to_date: z.string().trim().optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20)
});

export const exportRequestSchema = z.object({
  entity: z.string({ required_error: 'Please select an entity to export' }),
  format: z.enum(['csv', 'json']).default('csv'),
  status: z.string().optional(),
  priority: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(500)
});
