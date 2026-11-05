import { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  DollarSign,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import {
  useInvoicesQuery,
  useInvoiceStatsQuery,
  useCreateInvoiceMutation,
  useRecordPaymentMutation,
  PAYMENT_METHODS
} from '../../features/finances/index.js';
import { useCustomersQuery } from '../../features/customers/index.js';

export const InvoicesPage = () => {
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxRate, setTaxRate] = useState('8.25');
  const [invoiceNotes, setInvoiceNotes] = useState('Net 14 payment terms. Please remit promptly.');
  const [items, setItems] = useState([
    { description: 'Preventative Field Maintenance & Sensor Check', quantity: 1, unit_price: 650.0 }
  ]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Queries & Mutations
  const queryFilters = {
    search: search.trim() || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined
  };

  const { data: invoices = [], isLoading, refetch } = useInvoicesQuery(queryFilters);
  const { data: stats = {} } = useInvoiceStatsQuery();
  const { data: customers = [] } = useCustomersQuery({ limit: 100 });

  const createMutation = useCreateInvoiceMutation();
  const paymentMutation = useRecordPaymentMutation();

  const isManager = ['owner', 'admin', 'manager', 'superadmin'].includes(
    String(user?.role || '').toLowerCase()
  );

  // Live Invoice Totals Calculation
  const calculation = useMemo(() => {
    let subtotal = 0;
    for (const item of items) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unit_price) || 0;
      subtotal += Math.round(q * p * 100) / 100;
    }
    const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
    const taxable = Math.max(0, subtotal - discount);
    const rate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    const tax = Math.round(taxable * (rate / 100) * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount,
      taxable,
      tax,
      total
    };
  }, [items, discountAmount, taxRate]);

  // Dynamic Item Row Management
  const handleAddItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 100.0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === 'description' ? value : Number(value)
    };
    setItems(updated);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;

    await createMutation.mutateAsync({
      customer_id: customerId,
      due_date: dueDate,
      discount_amount: Number(discountAmount) || 0,
      tax_rate: Number(taxRate) || 0,
      notes: invoiceNotes.trim() || null,
      items: items.map((it) => ({
        description: it.description.trim() || 'Service / Equipment',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0
      }))
    });

    setCreateModalOpen(false);
    setCustomerId('');
    setItems([{ description: '', quantity: 1, unit_price: 100.0 }]);
    refetch();
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (
      !selectedInvoice ||
      !paymentAmount ||
      Number(paymentAmount) <= 0 ||
      !paymentReference.trim()
    ) {
      return;
    }

    await paymentMutation.mutateAsync({
      invoiceId: selectedInvoice.id,
      paymentData: {
        payment_reference: paymentReference.trim(),
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes.trim() || null
      }
    });

    setPaymentModalOpen(false);
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentReference('');
    refetch();
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(String(invoice.balance_due || invoice.total));
    setPaymentReference(`WIRE-${Date.now().toString().slice(-4)}`);
    setPaymentModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="success" size="sm">
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="warning" size="sm">
            Partial
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="primary" size="sm">
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="danger" size="sm">
            Overdue
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="default" size="sm">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            {status}
          </Badge>
        );
    }
  };

  const columns = [
    {
      key: 'invoice_number',
      label: 'Invoice Code',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
            {val || row.id}
          </span>
          <div className="text-[10px] text-slate-400">Issued: {row.issue_date}</div>
        </div>
      )
    },
    {
      key: 'customer_name',
      label: 'Client Account',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {val || row.client || 'Client Account'}
          </span>
          <div className="text-[11px] text-slate-400 truncate max-w-xs">
            {row.desc || row.notes}
          </div>
        </div>
      )
    },
    {
      key: 'due_date',
      label: 'Due Date',
      sortable: true,
      render: (val, row) => {
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = row.status !== 'paid' && row.status !== 'cancelled' && val < today;
        return (
          <span
            className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {val}
            {isOverdue && (
              <span className="ml-1 text-[10px] uppercase font-bold text-rose-500">Overdue</span>
            )}
          </span>
        );
      }
    },
    {
      key: 'total',
      label: 'Total Invoiced',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-slate-900 dark:text-white">
          ${Number(val || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'paid_amount',
      label: 'Paid',
      render: (val) => (
        <span className="text-xs font-medium text-emerald-600">${Number(val || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'balance_due',
      label: 'Balance Due',
      render: (val, row) => {
        const bal = val !== undefined ? Number(val) : Number(row.total || 0);
        return (
          <span
            className={`font-semibold text-xs ${bal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            ${bal.toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => getStatusBadge(val)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const balance =
          row.balance_due !== undefined ? Number(row.balance_due) : Number(row.total || 0);
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {isManager && balance > 0 && row.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 hover:bg-emerald-50 border-emerald-200 h-7 px-2"
                onClick={() => openPaymentModal(row)}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" /> Pay
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 h-7 px-2"
              onClick={() => {
                setSelectedInvoice(row);
                setDetailModalOpen(true);
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View
            </Button>

            <a
              href={`/api/invoices/${row.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              title="Download Printable Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
            </a>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Customer Invoicing & Payments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate itemized billing statements, calculate multi-rate taxes, and reconcile partial
            or full payments.
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Invoice
          </Button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Invoiced
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ${Number(stats.total_invoiced || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.total_invoices || 0} total billing statements
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                ${Number(stats.outstanding_balance || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/40 rounded-xl text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.pending_count || 0} pending • {stats.partial_count || 0} partial
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Reconciled
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                ${Number(stats.total_paid || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{stats.paid_count || 0} settled in full</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue Accounts
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                ${Number(stats.overdue_amount || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/40 rounded-xl text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.overdue_count || 0} past maturity date
          </p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice code, client name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Invoices' },
              { value: 'pending', label: 'Pending Payment' },
              { value: 'partial', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid in Full' },
              { value: 'overdue', label: 'Overdue Statements' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
        </div>
      </Card>

      {/* Invoice Ledger Table */}
      <Card className="overflow-hidden">
        <Table
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          emptyMessage="No billing records found matching the active criteria."
        />
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Customer Billing Statement"
      >
        <form
          onSubmit={handleCreateInvoice}
          className="space-y-4 max-h-[80vh] overflow-y-auto px-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Account *
              </label>
              <Select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={[
                  { value: '', label: '-- Select Customer --' },
                  ...customers.map((c) => ({
                    value: c.id,
                    label: `${c.name || c.company_name} (${c.customer_code || 'Account'})`
                  }))
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Itemized Lines */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                Line Items
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItemRow}
                className="h-7 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </Button>
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800"
              >
                <div className="col-span-6">
                  <Input
                    placeholder="Description of labor, service or part"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit Price ($)"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-1 text-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-slate-400 hover:text-rose-500"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Discounts, Taxes & Live Calculations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount Amount ($ USD)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax Rate (% Percentage)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>

          {/* Totals Summary Preview */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${calculation.subtotal.toFixed(2)}
              </span>
            </div>
            {calculation.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span>-${calculation.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Estimated Tax ({Number(taxRate || 0).toFixed(2)}%):</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${calculation.tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-indigo-700 dark:text-indigo-300 border-t border-indigo-200 dark:border-indigo-800 pt-1.5">
              <span>Total Invoice Amount:</span>
              <span>${calculation.total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Terms & Remittance Notes
            </label>
            <Input
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="e.g. Net 30 days. Remit check or wire referencing invoice code."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !customerId}>
              {createMutation.isPending ? 'Generating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment - ${selectedInvoice?.invoice_number || 'Invoice'}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold">{selectedInvoice?.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Total:</span>
              <span className="font-semibold">
                ${Number(selectedInvoice?.total || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid to Date:</span>
              <span className="text-emerald-600 font-semibold">
                ${Number(selectedInvoice?.paid_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                Remaining Balance Due:
              </span>
              <span className="text-rose-600 font-bold">
                $
                {Number(
                  selectedInvoice?.balance_due !== undefined
                    ? selectedInvoice.balance_due
                    : selectedInvoice?.total || 0
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={PAYMENT_METHODS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount ($ USD) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInvoice?.balance_due || selectedInvoice?.total}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Reference / Check # *
              </label>
              <Input
                required
                placeholder="e.g. CHK-8802 or WIRE-4091"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          {/* PCI-DSS Security Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
              <strong>PCI-DSS Compliance Notice:</strong> Card details (PAN, CVV, exp date) must
              never be entered directly. For terminal card transactions, record the authorization
              code as the payment reference.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reconciliation Notes (Optional)
            </label>
            <Input
              placeholder="e.g. Cleared via customer operating account"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={paymentMutation.isPending || !paymentAmount}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Billing Statement - ${selectedInvoice?.invoice_number || 'Details'}`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedInvoice?.customer_name}
              </div>
              <div className="text-xs text-slate-400">
                Issued on {selectedInvoice?.issue_date} • Due by {selectedInvoice?.due_date}
              </div>
            </div>
            <div>{getStatusBadge(selectedInvoice?.status)}</div>
          </div>

          {/* Itemized Table */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Itemized Services & Parts
            </h4>
            <div className="border rounded-md overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                  <tr>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-center w-16">Qty</th>
                    <th className="p-2 text-right w-24">Price</th>
                    <th className="p-2 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(selectedInvoice?.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center">{Number(it.quantity).toFixed(2)}</td>
                      <td className="p-2 text-right">${Number(it.unit_price).toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold">
                        ${Number(it.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end">
            <div className="w-64 text-xs space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold">
                  ${Number(selectedInvoice?.subtotal || 0).toFixed(2)}
                </span>
              </div>
              {Number(selectedInvoice?.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-${Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Tax:</span>
                <span className="font-semibold">
                  ${Number(selectedInvoice?.tax || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-1">
                <span>Total:</span>
                <span>${Number(selectedInvoice?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Paid to Date:</span>
                <span className="font-semibold">
                  ${Number(selectedInvoice?.paid_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-rose-600 border-t pt-1">
                <span>Balance Due:</span>
                <span>
                  $
                  {Number(
                    selectedInvoice?.balance_due !== undefined
                      ? selectedInvoice.balance_due
                      : selectedInvoice?.total || 0
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <a
              href={`/api/invoices/${selectedInvoice?.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <Download className="w-4 h-4" /> Download Printable HTML Statement
            </a>

            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesPage;
