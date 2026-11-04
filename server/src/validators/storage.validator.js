import { z } from 'zod';

export const uploadFileSchema = z.object({
  bucket: z.enum([
    'org-documents',
    'customer-attachments',
    'project-files',
    'work-order-photos',
    'invoice-documents',
    'org-assets'
  ]),
  fileName: z.string().min(1, 'File name is required'),
  category: z.string().optional(),
  fileData: z.string().optional(), // Base64 encoded payload
  mimeType: z.string().optional(),
  fileSize: z.number().nonnegative().optional()
});

export const signedUrlSchema = z.object({
  bucket: z.string().min(1, 'Bucket name is required'),
  filePath: z.string().min(1, 'File path is required'),
  expiresIn: z.number().positive().max(86400).optional() // Maximum 24 hours
});

export default {
  uploadFileSchema,
  signedUrlSchema
};
