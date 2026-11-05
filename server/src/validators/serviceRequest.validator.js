import { z } from 'zod';

export const SERVICE_CATEGORIES = [
  'repair',
  'maintenance',
  'safety',
  'installation',
  'inspection',
  'emergency'
];

export const SERVICE_URGENCIES = ['low', 'normal', 'high', 'urgent', 'critical'];

export const SERVICE_STATUSES = ['new', 'in_review', 'approved', 'rejected', 'converted', 'closed'];

export const createServiceRequestSchema = z.object({
  title: z
    .string({ required_error: 'Request title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  description: z.string().optional().default(''),
  customer_id: z.string().optional(),
  location: z.string().max(255).optional().default(''),
  service_type: z.enum(SERVICE_CATEGORIES).optional().default('repair'),
  urgency: z.enum(SERVICE_URGENCIES).optional().default('normal'),
  estimated_cost: z.coerce
    .number()
    .min(0, 'Estimated cost cannot be negative')
    .optional()
    .default(0),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        file_size: z.number().optional(),
        type: z.string().optional()
      })
    )
    .optional()
    .default([])
});

export const updateServiceRequestSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  location: z.string().max(255).optional(),
  service_type: z.enum(SERVICE_CATEGORIES).optional(),
  urgency: z.enum(SERVICE_URGENCIES).optional(),
  estimated_cost: z.coerce.number().min(0).optional(),
  assigned_to: z.string().nullable().optional()
});

export const reviewServiceRequestSchema = z.object({
  manager_notes: z.string().max(2000).optional().default('')
});

export const approveServiceRequestSchema = z.object({
  manager_notes: z.string().max(2000).optional().default('')
});

export const rejectServiceRequestSchema = z.object({
  rejection_reason: z
    .string({ required_error: 'Rejection reason is required' })
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(2000, 'Rejection reason must not exceed 2000 characters')
});

export const addServiceAttachmentSchema = z.object({
  name: z.string().min(1, 'Attachment filename is required'),
  url: z.string().min(1, 'Attachment URL is required'),
  file_size: z.number().min(0).optional(),
  type: z.string().optional()
});

export const convertServiceRequestSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  assigned_to: z.string().optional(),
  site: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  cost_estimate: z.coerce.number().min(0).optional(),
  initial_checklist: z.array(z.string()).optional()
});

export default {
  create: createServiceRequestSchema,
  update: updateServiceRequestSchema,
  review: reviewServiceRequestSchema,
  approve: approveServiceRequestSchema,
  reject: rejectServiceRequestSchema,
  addAttachment: addServiceAttachmentSchema,
  convert: convertServiceRequestSchema
};
