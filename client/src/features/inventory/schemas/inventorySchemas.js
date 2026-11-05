import { z } from 'zod';

export const inventoryItemCreateSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .min(2, 'SKU must be at least 2 characters')
    .max(100),
  name: z
    .string({ required_error: 'Item name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(255),
  category: z
    .string({ required_error: 'Category is required' })
    .min(2, 'Category is required')
    .max(100),
  location: z.string().optional().default('Warehouse Central'),
  supplier_id: z.string().optional().nullable(),
  in_stock: z.coerce.number().int('Stock must be a whole integer').min(0).default(0),
  reorder_level: z.coerce.number().int('Reorder level must be an integer').min(0).default(5),
  unit_cost: z.coerce.number().min(0).default(0)
});

export const stockInSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0).optional().default(0),
  supplier_id: z.string().optional().nullable(),
  reference_type: z.string().default('purchase_order'),
  reference_id: z.string().optional(),
  reference_note: z.string().optional().default('')
});

export const stockOutSchema = z.object({
  quantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  reference_type: z.string().default('work_order'),
  reference_id: z.string().optional(),
  reference_note: z.string().optional().default('')
});

export const stockAdjustSchema = z.object({
  adjustment_type: z.enum(['set_absolute', 'delta']).default('set_absolute'),
  quantity: z.coerce
    .number({ required_error: 'Stock count is required' })
    .int('Must be a whole integer'),
  reason: z
    .string({ required_error: 'Reason is required' })
    .min(3, 'Adjustment reason must be at least 3 characters')
    .max(500)
});

export const assetCreateSchema = z.object({
  asset_tag: z
    .string({ required_error: 'Asset tag is required' })
    .min(2, 'Asset tag must be at least 2 characters')
    .max(100),
  name: z
    .string({ required_error: 'Asset name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(255),
  category: z
    .enum(['vehicle', 'heavy_machinery', 'diagnostic_tool', 'equipment', 'facility'])
    .default('equipment'),
  status: z
    .enum(['available', 'assigned', 'maintenance', 'retired', 'damaged'])
    .default('available'),
  assigned_to: z.string().optional().nullable(),
  serial_number: z.string().optional().default(''),
  purchase_date: z.string().optional(),
  purchase_cost: z.coerce.number().min(0).default(0),
  location: z.string().optional().default('Main Facility'),
  department: z.string().optional().default('Operations')
});

export const assetAssignSchema = z.object({
  assigned_to: z.string({ required_error: 'Please select a workforce member' }).min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

export const assetMaintenanceSchema = z.object({
  date: z.string({ required_error: 'Maintenance date is required' }).min(1),
  type: z.enum(['scheduled', 'repair', 'calibration', 'inspection']).default('scheduled'),
  description: z
    .string({ required_error: 'Description is required' })
    .min(3, 'Description must be at least 3 characters')
    .max(1000),
  cost: z.coerce.number().min(0).default(0),
  performed_by: z.string().optional().default('Service Technician'),
  next_service_due: z.string().optional()
});

export const supplierCreateSchema = z.object({
  name: z
    .string({ required_error: 'Supplier name is required' })
    .min(2, 'Name must be at least 2 characters'),
  code: z
    .string({ required_error: 'Supplier code is required' })
    .min(2, 'Code must be at least 2 characters')
    .max(50),
  contact_name: z.string().optional().default(''),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  payment_terms: z.string().optional().default('Net 30'),
  category: z.string().optional().default('General Parts'),
  status: z.enum(['active', 'inactive', 'preferred']).default('active')
});

export const purchaseOrderCreateSchema = z.object({
  po_number: z.string().optional(),
  order_date: z.string().optional(),
  items: z
    .array(
      z.object({
        item_id: z.string().optional().nullable(),
        sku: z.string().min(1, 'SKU required'),
        name: z.string().min(1, 'Name required'),
        quantity: z.coerce.number().int().min(1),
        unit_price: z.coerce.number().min(0)
      })
    )
    .min(1, 'At least one line item is required'),
  notes: z.string().optional().default('')
});
