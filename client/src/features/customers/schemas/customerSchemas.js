import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Contact name is required').min(2, 'Name must be at least 2 characters'),
  company_name: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  sla_tier: z
    .enum(['standard', 'silver', 'gold', 'platinum', 'critical', 'premium'])
    .default('standard'),
  status: z.enum(['active', 'inactive', 'suspended', 'lead']).default('active'),
  lead_status: z.enum(['lead', 'prospect', 'active', 'churned']).default('active'),
  follow_up_date: z.string().optional().nullable(),
  follow_up_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const customerUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  email: z.string().email('Please enter a valid email address').optional(),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended', 'lead']).optional(),
  sla_tier: z.enum(['standard', 'silver', 'gold', 'platinum', 'critical', 'premium']).optional(),
  lead_status: z.enum(['lead', 'prospect', 'active', 'churned']).optional(),
  follow_up_date: z.string().optional().nullable(),
  follow_up_notes: z.string().optional().nullable()
});

export const customerNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note text is required').max(5000)
});

export const customerFollowUpSchema = z.object({
  lead_status: z.enum(['lead', 'prospect', 'active', 'churned']),
  follow_up_date: z.string().optional().nullable(),
  follow_up_notes: z.string().optional().nullable()
});

export const serviceRequestCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
  location: z.string().trim().min(2, 'Site / facility location is required').max(255),
  urgency: z.enum(['critical', 'urgent', 'high', 'normal', 'low']).default('normal'),
  service_type: z.string().trim().default('repair')
});

export const serviceRequestFeedbackSchema = z.object({
  rating: z.coerce
    .number()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comments: z.string().trim().max(2000).optional().nullable()
});

export const customerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.any().optional().nullable()
});
