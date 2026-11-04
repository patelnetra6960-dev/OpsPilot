import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Contact name is required').min(2, 'Name must be at least 2 characters'),
  company_name: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z.string().optional(),
  billing_address: z.string().optional()
});

export const customerUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  email: z.string().email('Please enter a valid email address').optional(),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
});
