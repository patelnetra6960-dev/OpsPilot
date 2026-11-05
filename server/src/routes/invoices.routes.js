import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller.js';
import { requireAuth, requireManagerOrAdmin } from '../middleware/authMiddleware.js';
import { requireTenant } from '../middleware/tenantMiddleware.js';
import validate from '../middleware/validateMiddleware.js';
import {
  createInvoiceSchema,
  recordPaymentSchema,
  invoiceQuerySchema
} from '../validators/invoice.validator.js';

const router = Router();

// Authentication and Multi-Tenant boundary required for all billing endpoints
router.use(requireAuth);
router.use(requireTenant);

// 1. KPI & Analytics
router.get('/stats', invoiceController.getInvoiceStats);

// 2. Collection Operations
router.get('/', validate(invoiceQuerySchema, 'query'), invoiceController.listInvoices);
router.post(
  '/',
  requireManagerOrAdmin,
  validate(createInvoiceSchema),
  invoiceController.createInvoice
);

// 3. Document Generation & Printable Downloads
router.get('/:id/pdf', invoiceController.renderInvoiceHtml);
router.get('/:id/download', invoiceController.downloadInvoice);
router.get('/:id/printable', invoiceController.renderInvoiceHtml);

// 4. Entity Details & Payments
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/payments', invoiceController.getInvoicePayments);
router.post(
  '/:id/payments',
  requireManagerOrAdmin,
  validate(recordPaymentSchema),
  invoiceController.recordPayment
);

export default router;
