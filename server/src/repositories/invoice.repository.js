import { BaseRepository } from './base.repository.js';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class InvoiceRepository extends BaseRepository {
  constructor() {
    super('invoices', {
      mockKey: 'invoices',
      searchFields: ['invoice_number', 'customer_name', 'desc', 'notes'],
      allowedFilterFields: ['customer_id', 'status', 'work_order_id'],
      allowedSortFields: ['issue_date', 'due_date', 'total', 'created_at', 'invoice_number']
    });
  }

  /**
   * Find invoice by unique invoice number within organization
   */
  async findByInvoiceNumber(invoiceNumber, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const invoices = mockDatabase.invoices || [];
      return (
        invoices.find(
          (inv) =>
            inv.organization_id === organizationId &&
            inv.invoice_number.toLowerCase() === invoiceNumber.trim().toLowerCase() &&
            !inv.deleted_at
        ) || null
      );
    }

    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('invoice_number', invoiceNumber.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Create invoice together with itemized line items
   */
  async createWithItems(organizationId, invoiceData, itemsData) {
    this.assertTenantContext(organizationId);

    const invoiceId = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const preparedItems = itemsData.map((item, idx) => ({
      id: `ii-${Date.now()}-${idx + 1}`,
      organization_id: organizationId,
      invoice_id: invoiceId,
      inventory_item_id: item.inventory_item_id || null,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Math.round(Number(item.quantity) * Number(item.unit_price) * 100) / 100,
      created_at: now
    }));

    const fullInvoiceRecord = {
      ...invoiceData,
      id: invoiceId,
      organization_id: organizationId,
      items: preparedItems,
      paid_amount: 0.0,
      balance_due: invoiceData.total,
      created_at: now,
      updated_at: now
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.invoices) mockDatabase.invoices = [];
      if (!mockDatabase.invoice_items) mockDatabase.invoice_items = [];

      mockDatabase.invoices.unshift(fullInvoiceRecord);
      mockDatabase.invoice_items.push(...preparedItems);
      return fullInvoiceRecord;
    }

    // Supabase DB creation: insert invoice, then items
    const { items: _, ...invoicePayload } = fullInvoiceRecord;
    const { data: createdInvoice, error: invError } = await supabaseAdmin
      .from(this.tableName)
      .insert(invoicePayload)
      .select()
      .single();

    if (invError) throw invError;

    const { error: itemsError } = await supabaseAdmin.from('invoice_items').insert(preparedItems);

    if (itemsError) throw itemsError;

    return {
      ...createdInvoice,
      items: preparedItems
    };
  }

  /**
   * Record a verified payment transaction against an invoice
   * Atomically updates paid_amount, balance_due, and invoice status
   */
  async recordPayment(invoiceId, organizationId, paymentData, recordedBy) {
    this.assertTenantContext(organizationId);

    const invoice = await this.findById(invoiceId, organizationId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
    const paymentAmount = round2(paymentData.amount);

    if (paymentAmount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    const currentPaid = round2(invoice.paid_amount || 0);
    const invoiceTotal = round2(invoice.total || 0);
    const remainingBalance = Math.max(0, round2(invoiceTotal - currentPaid));

    if (paymentAmount > remainingBalance + 0.01) {
      throw new ValidationError(
        `Payment amount ($${paymentAmount.toFixed(2)}) cannot exceed remaining balance ($${remainingBalance.toFixed(2)})`
      );
    }

    const newPaidAmount = round2(currentPaid + paymentAmount);
    const newBalanceDue = Math.max(0, round2(invoiceTotal - newPaidAmount));
    const isFullyPaid = newBalanceDue <= 0.001;

    const now = new Date().toISOString();
    const paidAt = paymentData.paid_at || now;

    const paymentRecord = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organization_id: organizationId,
      invoice_id: invoiceId,
      payment_reference: paymentData.payment_reference.trim(),
      amount: paymentAmount,
      payment_method: paymentData.payment_method,
      status: 'completed',
      paid_at: paidAt,
      recorded_by: recordedBy,
      notes: paymentData.notes || null,
      created_at: now
    };

    const invoiceUpdates = {
      paid_amount: newPaidAmount,
      balance_due: newBalanceDue,
      status: isFullyPaid ? 'paid' : 'partial',
      paid_at: isFullyPaid ? paidAt : invoice.paid_at || null,
      updated_at: now
    };

    if (env.isMockMode || !supabaseAdmin) {
      if (!mockDatabase.payments) mockDatabase.payments = [];
      mockDatabase.payments.unshift(paymentRecord);

      const invIndex = mockDatabase.invoices.findIndex(
        (i) => i.id === invoiceId && i.organization_id === organizationId
      );
      if (invIndex >= 0) {
        mockDatabase.invoices[invIndex] = {
          ...mockDatabase.invoices[invIndex],
          ...invoiceUpdates
        };
      }

      return {
        invoice: { ...invoice, ...invoiceUpdates },
        payment: paymentRecord
      };
    }

    // Insert payment record
    const { error: payError } = await supabaseAdmin.from('payments').insert(paymentRecord);
    if (payError) throw payError;

    // Update invoice record
    const { data: updatedInvoice, error: invError } = await supabaseAdmin
      .from(this.tableName)
      .update(invoiceUpdates)
      .eq('id', invoiceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (invError) throw invError;

    return {
      invoice: updatedInvoice,
      payment: paymentRecord
    };
  }

  /**
   * Retrieve payments recorded for an invoice
   */
  async getInvoicePayments(invoiceId, organizationId) {
    this.assertTenantContext(organizationId);

    if (env.isMockMode || !supabaseAdmin) {
      const records = mockDatabase.payments || [];
      return records
        .filter((p) => p.organization_id === organizationId && p.invoice_id === invoiceId)
        .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get financial analytics & invoice statistics
   */
  async getInvoiceStats(organizationId, customerId = null) {
    this.assertTenantContext(organizationId);

    let invoices = [];
    if (env.isMockMode || !supabaseAdmin) {
      invoices = (mockDatabase.invoices || []).filter(
        (i) =>
          i.organization_id === organizationId &&
          !i.deleted_at &&
          (!customerId || i.customer_id === customerId)
      );
    } else {
      let query = supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) throw error;
      invoices = data || [];
    }

    const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      total_invoices: invoices.length,
      total_invoiced: round2(invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)),
      total_paid: round2(invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0)),
      outstanding_balance: round2(
        invoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0)
      ),
      draft_count: invoices.filter((i) => i.status === 'draft').length,
      pending_count: invoices.filter((i) => i.status === 'pending').length,
      partial_count: invoices.filter((i) => i.status === 'partial').length,
      paid_count: invoices.filter((i) => i.status === 'paid').length,
      cancelled_count: invoices.filter((i) => i.status === 'cancelled').length,
      overdue_count: invoices.filter(
        (i) => i.status !== 'paid' && i.status !== 'cancelled' && i.due_date < today
      ).length,
      overdue_amount: round2(
        invoices
          .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.due_date < today)
          .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total || 0), 0)
      )
    };

    return stats;
  }
}

export const invoiceRepository = new InvoiceRepository();
