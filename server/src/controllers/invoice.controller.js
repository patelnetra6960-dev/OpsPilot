import { invoiceService } from '../services/invoice.service.js';
import { sendSuccess } from '../utils/responseHandler.js';
import asyncHandler from '../middleware/asyncHandler.js';

export class InvoiceController {
  /**
   * Helper to build user context from request
   */
  getUserContext(req) {
    return {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user?.full_name || req.user?.name,
      role: req.membership?.role || req.userRole || req.user?.role || 'employee'
    };
  }

  /**
   * List paginated invoices
   */
  listInvoices = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await invoiceService.listInvoices(organizationId, req.query, userContext);
    return sendSuccess(res, result.data, 'Invoices retrieved successfully', 200, result.pagination);
  });

  /**
   * Get single invoice with itemized lines & payments
   */
  getInvoiceById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const invoice = await invoiceService.getInvoiceById(id, organizationId, userContext);
    return sendSuccess(res, invoice, 'Invoice retrieved successfully');
  });

  /**
   * Create invoice with itemized line items
   */
  createInvoice = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const created = await invoiceService.createInvoice(organizationId, req.body, userContext);
    return sendSuccess(res, created, 'Invoice generated successfully', 201);
  });

  /**
   * Record payment transaction against invoice
   */
  recordPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await invoiceService.recordPayment(id, organizationId, req.body, userContext);
    return sendSuccess(res, result, 'Payment recorded and invoice reconciled successfully', 201);
  });

  /**
   * Get payments recorded for an invoice
   */
  getInvoicePayments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const invoice = await invoiceService.getInvoiceById(id, organizationId, userContext);
    return sendSuccess(res, invoice.payments || [], 'Invoice payments retrieved successfully');
  });

  /**
   * Get invoice analytics / KPI summary
   */
  getInvoiceStats = asyncHandler(async (req, res) => {
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const stats = await invoiceService.getInvoiceStats(organizationId, userContext);
    return sendSuccess(res, stats, 'Invoice statistics retrieved successfully');
  });

  /**
   * Render Printable HTML / PDF view
   */
  renderInvoiceHtml = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await invoiceService.renderInvoiceHtml(id, organizationId, userContext);

    // If client requested raw HTML document
    if (req.headers.accept?.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(result.html);
    }

    // Default JSON response containing renderable HTML string and metadata
    return sendSuccess(res, result, 'Invoice printable document rendered');
  });

  /**
   * Download Invoice document (HTML / PDF printable)
   */
  downloadInvoice = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.tenant.id;
    const userContext = this.getUserContext(req);
    const result = await invoiceService.renderInvoiceHtml(id, organizationId, userContext);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${result.invoice.invoice_number}.html"`
    );
    return res.send(result.html);
  });
}

export const invoiceController = new InvoiceController();
