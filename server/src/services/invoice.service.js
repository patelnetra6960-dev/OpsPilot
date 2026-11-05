import { invoiceRepository } from '../repositories/invoice.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import auditService from './audit.service.js';

export class InvoiceService {
  /**
   * Helper to round monetary amounts safely avoiding floating point drifts
   */
  round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
  }

  /**
   * Helper to check if role has billing management rights
   */
  isBillingManager(role) {
    return ['owner', 'admin', 'manager', 'superadmin'].includes(String(role || '').toLowerCase());
  }

  /**
   * Resolve customer ID for authenticated user
   */
  async getCustomerForUser(userId, organizationId) {
    if (!userId || !organizationId) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const customers = mockDatabase.customers || [];
      return (
        customers.find(
          (c) => c.organization_id === organizationId && c.user_id === userId && !c.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  /**
   * Resolve customer details by Customer ID
   */
  async getCustomerById(customerId, organizationId) {
    if (!customerId || !organizationId) return null;

    if (env.isMockMode || !supabaseAdmin) {
      const customers = mockDatabase.customers || [];
      return (
        customers.find((c) => c.id === customerId && c.organization_id === organizationId) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  /**
   * Generate sequential invoice number (e.g. INV-2026-005)
   */
  async generateInvoiceNumber(organizationId) {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const { data: allInvoices } = await invoiceRepository.findMany(organizationId, { limit: 100 });
    const existingOrgNumbers = (allInvoices || [])
      .map((i) => i.invoice_number)
      .filter((num) => num && num.startsWith(prefix));

    let nextNumber = existingOrgNumbers.length + 1;
    let candidate = `${prefix}${String(nextNumber).padStart(3, '0')}`;

    while (existingOrgNumbers.includes(candidate)) {
      nextNumber += 1;
      candidate = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }

    return candidate;
  }

  /**
   * Accurate monetary calculation for invoice line items, tax, and totals
   */
  calculateTotals(items = [], discountAmount = 0, taxRate = 0) {
    let subtotalCents = 0;

    const calculatedItems = items.map((item) => {
      const qty = Number(item.quantity);
      const unitPriceCents = Math.round(Number(item.unit_price) * 100);
      const itemTotalCents = Math.round(qty * unitPriceCents);
      subtotalCents += itemTotalCents;

      return {
        ...item,
        quantity: qty,
        unit_price: unitPriceCents / 100,
        total_price: itemTotalCents / 100
      };
    });

    const subtotal = subtotalCents / 100;
    const discount = Math.min(subtotal, Math.max(0, this.round2(discountAmount)));
    const taxableBase = Math.max(0, this.round2(subtotal - discount));
    const rate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    const taxCents = Math.round(taxableBase * 100 * (rate / 100));
    const tax = taxCents / 100;
    const total = this.round2(taxableBase + tax);

    return {
      items: calculatedItems,
      subtotal,
      discount_amount: discount,
      taxable_amount: taxableBase,
      tax_rate: rate,
      tax,
      total
    };
  }

  /**
   * Create new invoice with itemized line items
   */
  async createInvoice(organizationId, payload, userContext = {}) {
    const { role, userId } = userContext;
    if (!this.isBillingManager(role)) {
      throw new ForbiddenError('Manager or Admin permissions required to create invoices');
    }

    const invoiceNumber =
      payload.invoice_number || (await this.generateInvoiceNumber(organizationId));

    // Enforce unique invoice number within organization
    const existing = await invoiceRepository.findByInvoiceNumber(invoiceNumber, organizationId);
    if (existing) {
      throw new ConflictError(
        `Invoice number '${invoiceNumber}' already exists in this organization`
      );
    }

    // Resolve customer
    const customer = await this.getCustomerById(payload.customer_id, organizationId);
    const customerName = customer ? customer.name || customer.company_name : 'Valued Client';

    // Compute monetary totals with integer minor units
    const { items, subtotal, discount_amount, tax_rate, tax, total } = this.calculateTotals(
      payload.items,
      payload.discount_amount,
      payload.tax_rate
    );

    const invoiceData = {
      invoice_number: invoiceNumber,
      customer_id: payload.customer_id,
      customer_name: customerName,
      work_order_id: payload.work_order_id || null,
      issue_date: payload.issue_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date,
      subtotal,
      discount_amount,
      tax_rate,
      tax,
      total,
      paid_amount: 0.0,
      balance_due: total,
      status: 'pending',
      desc: payload.notes || `Invoice ${invoiceNumber}`,
      notes: payload.notes || null
    };

    const created = await invoiceRepository.createWithItems(organizationId, invoiceData, items);

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: created.id,
      metadata: { invoiceNumber: created.invoice_number, total: created.total }
    });

    return created;
  }

  /**
   * List invoices with role-based filtering (Customers see ONLY their own)
   */
  async listInvoices(organizationId, query = {}, userContext = {}) {
    const { role, userId } = userContext;
    const isManager = this.isBillingManager(role);

    const queryFilters = { ...query };

    // IDOR protection: Customers can only query their own invoices
    if (!isManager) {
      const customer = await this.getCustomerForUser(userId, organizationId);
      if (!customer) {
        return {
          data: [],
          pagination: {
            page: query.page || 1,
            limit: query.limit || 20,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }
      queryFilters.customer_id = customer.id;
    }

    const result = await invoiceRepository.findMany(organizationId, queryFilters);

    let items = result.data;
    if (query.from_date) {
      items = items.filter((inv) => inv.issue_date >= query.from_date);
    }
    if (query.to_date) {
      items = items.filter((inv) => inv.issue_date <= query.to_date);
    }

    return {
      data: items,
      pagination: result.pagination
    };
  }

  /**
   * Get single invoice by ID with payments history
   */
  async getInvoiceById(id, organizationId, userContext = {}) {
    const invoice = await invoiceRepository.findById(id, organizationId);
    if (!invoice) throw new NotFoundError('Invoice', id);

    const { role, userId } = userContext;
    const isManager = this.isBillingManager(role);

    if (!isManager) {
      const customer = await this.getCustomerForUser(userId, organizationId);
      if (!customer || invoice.customer_id !== customer.id) {
        throw new ForbiddenError(
          'Access Denied: You cannot view invoices belonging to other accounts (IDOR Protection)'
        );
      }
    }

    const payments = await invoiceRepository.getInvoicePayments(id, organizationId);
    return {
      ...invoice,
      payments
    };
  }

  /**
   * Record a verified payment transaction against an invoice
   */
  async recordPayment(invoiceId, organizationId, paymentData, userContext = {}) {
    const { role, userId } = userContext;
    if (!this.isBillingManager(role)) {
      throw new ForbiddenError('Manager or Admin permissions required to record payments');
    }

    const invoice = await invoiceRepository.findById(invoiceId, organizationId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    if (invoice.status === 'paid' || invoice.balance_due <= 0.001) {
      throw new ValidationError(
        'Invoice is already fully paid. No additional payments can be applied.'
      );
    }

    if (invoice.status === 'cancelled') {
      throw new ValidationError('Cannot record payments against a cancelled invoice');
    }

    const result = await invoiceRepository.recordPayment(
      invoiceId,
      organizationId,
      paymentData,
      userId
    );

    await auditService.recordSecurityEvent({
      organizationId,
      userId,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: result.payment.id,
      metadata: {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        amount: result.payment.amount,
        newStatus: result.invoice.status
      }
    });

    return result;
  }

  /**
   * Get invoice analytics / KPI summary
   */
  async getInvoiceStats(organizationId, userContext = {}) {
    const { role, userId } = userContext;
    const isManager = this.isBillingManager(role);

    let customerId = null;
    if (!isManager) {
      const customer = await this.getCustomerForUser(userId, organizationId);
      customerId = customer ? customer.id : '__no_access__';
    }

    return await invoiceRepository.getInvoiceStats(organizationId, customerId);
  }

  /**
   * Render Printable HTML / PDF view of an invoice
   */
  async renderInvoiceHtml(id, organizationId, userContext = {}) {
    const invoice = await this.getInvoiceById(id, organizationId, userContext);
    const customer = await this.getCustomerById(invoice.customer_id, organizationId);

    const items = invoice.items || [];
    const payments = invoice.payments || [];

    const itemsRows = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b;">
            ${item.description}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">
            ${Number(item.quantity).toFixed(2)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: right;">
            $${Number(item.unit_price).toFixed(2)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">
            $${Number(item.total_price).toFixed(2)}
          </td>
        </tr>`
      )
      .join('');

    const paymentsRows =
      payments.length > 0
        ? payments
            .map(
              (p) => `
            <tr>
              <td style="padding: 6px 12px; font-size: 12px; color: #475569;">${new Date(p.paid_at).toLocaleDateString()}</td>
              <td style="padding: 6px 12px; font-size: 12px; color: #475569;">${p.payment_reference}</td>
              <td style="padding: 6px 12px; font-size: 12px; color: #475569; text-transform: uppercase;">${p.payment_method}</td>
              <td style="padding: 6px 12px; font-size: 12px; color: #166534; font-weight: 600; text-align: right;">-$${Number(p.amount).toFixed(2)}</td>
            </tr>`
            )
            .join('')
        : '<tr><td colspan="4" style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-style: italic;">No recorded payments yet</td></tr>';

    const statusColor =
      invoice.status === 'paid'
        ? '#16a34a'
        : invoice.status === 'partial'
          ? '#d97706'
          : invoice.status === 'overdue'
            ? '#dc2626'
            : '#2563eb';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number} - OpsPilot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; background: #fff; color: #0f172a; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; text-align: right; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #fff; background: ${statusColor}; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .meta-col { width: 45%; }
    .meta-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-val { font-size: 14px; color: #1e293b; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .summary-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .summary-table { width: 320px; }
    .summary-table td { padding: 6px 12px; font-size: 13px; }
    .summary-total { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button onclick="window.print()" style="background: #4f46e5; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
        Print / Save as PDF
      </button>
    </div>

    <div class="header">
      <div>
        <div class="brand">OpsPilot Enterprise</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Operational Field & Logistics Platform</div>
      </div>
      <div>
        <h1 class="invoice-title">INVOICE</h1>
        <div style="text-align: right; margin-bottom: 6px;">
          <span class="status-badge">${invoice.status}</span>
        </div>
        <div style="font-size: 13px; font-family: monospace; font-weight: 700; color: #4f46e5; text-align: right;">
          ${invoice.invoice_number}
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-label">Billed To</div>
        <div class="meta-val" style="font-weight: 600;">${invoice.customer_name || 'Valued Client'}</div>
        <div class="meta-val">${customer?.address || 'Customer Commercial Account'}</div>
        <div class="meta-val">${customer?.contact_email || customer?.email || ''}</div>
      </div>
      <div class="meta-col" style="text-align: right;">
        <div class="meta-label">Invoice Details</div>
        <div class="meta-val"><strong>Issue Date:</strong> ${invoice.issue_date}</div>
        <div class="meta-val"><strong>Due Date:</strong> ${invoice.due_date}</div>
        ${invoice.paid_at ? `<div class="meta-val" style="color: #16a34a;"><strong>Settled On:</strong> ${new Date(invoice.paid_at).toLocaleDateString()}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Description</th>
          <th style="text-align: center; width: 80px;">Qty</th>
          <th style="text-align: right; width: 110px;">Unit Price</th>
          <th style="text-align: right; width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="summary-box">
      <table class="summary-table">
        <tr>
          <td style="color: #475569;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">$${Number(invoice.subtotal).toFixed(2)}</td>
        </tr>
        ${
          Number(invoice.discount_amount || 0) > 0
            ? `
        <tr>
          <td style="color: #dc2626;">Discount:</td>
          <td style="text-align: right; color: #dc2626;">-$${Number(invoice.discount_amount).toFixed(2)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="color: #475569;">Tax (${Number(invoice.tax_rate || 0).toFixed(2)}%):</td>
          <td style="text-align: right; font-weight: 600;">$${Number(invoice.tax || 0).toFixed(2)}</td>
        </tr>
        <tr class="summary-total">
          <td>Total Amount:</td>
          <td style="text-align: right;">$${Number(invoice.total).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #16a34a;">Amount Paid:</td>
          <td style="text-align: right; color: #16a34a; font-weight: 600;">$${Number(invoice.paid_amount || 0).toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0; font-weight: 700; color: ${invoice.balance_due > 0 ? '#b91c1c' : '#15803d'};">
          <td>Balance Due:</td>
          <td style="text-align: right;">$${Number(invoice.balance_due || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    ${
      payments.length > 0
        ? `
    <div style="margin-bottom: 24px;">
      <div class="meta-label">Payment History</div>
      <table style="margin-top: 8px;">
        <thead>
          <tr>
            <th style="text-align: left;">Date</th>
            <th style="text-align: left;">Reference</th>
            <th style="text-align: left;">Method</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsRows}
        </tbody>
      </table>
    </div>`
        : ''
    }

    <div class="footer">
      <div>${invoice.notes ? `<strong>Notes:</strong> ${invoice.notes}` : 'Thank you for your business. Remit payment according to agreed terms.'}</div>
      <div style="margin-top: 8px; font-size: 11px;">Questions? Contact accounting@opspilot.internal</div>
    </div>
  </div>
</body>
</html>`;

    return {
      html,
      invoice
    };
  }
}

export const invoiceService = new InvoiceService();
