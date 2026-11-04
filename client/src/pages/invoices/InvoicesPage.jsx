import { useState } from 'react';
import { CreditCard, Plus, Search, DollarSign, Download, CheckCircle2, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const InvoicesPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Invoice state
  const [clientName, setClientName] = useState('Metro Retail Distribution Co.');
  const [amount, setAmount] = useState('1500.00');
  const [description, setDescription] = useState('Bi-weekly Dedicated Fleet Support');

  const [invoices, setInvoices] = useState([
    {
      id: 'INV-2026-081',
      client: 'Metro Retail Distribution Co.',
      amount: '$4,250.00',
      date: '2026-11-01',
      due: '2026-11-15',
      status: 'pending',
      description: 'October Monthly Field Dispatch & Logistics Support'
    },
    {
      id: 'INV-2026-074',
      client: 'Pacific Freight Express',
      amount: '$12,800.00',
      date: '2026-10-15',
      due: '2026-10-30',
      status: 'paid',
      description: 'Quarterly Maintenance Contract & Fleet Inspection'
    },
    {
      id: 'INV-2026-068',
      client: 'Harbor Cold Chain Logistics',
      amount: '$3,150.00',
      date: '2026-10-01',
      due: '2026-10-15',
      status: 'paid',
      description: 'Emergency Hydraulic Loading Ramp Overhaul'
    }
  ]);

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const newInvoice = {
      id: `INV-2026-0${Math.floor(80 + Math.random() * 20)}`,
      client: clientName,
      amount: `$${parseFloat(amount).toFixed(2)}`,
      date: new Date().toISOString().split('T')[0],
      due: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      description: description
    };

    setInvoices([newInvoice, ...invoices]);
    setModalOpen(false);
    setDescription('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Invoice Generated',
        message: `${newInvoice.id} created for ${newInvoice.client}`
      })
    );
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.client.toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      key: 'id',
      label: 'Invoice Code',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
            {val}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs">{row.description}</div>
        </div>
      )
    },
    {
      key: 'client',
      label: 'Client Account',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{val}</span>
      )
    },
    {
      key: 'amount',
      label: 'Total Amount',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{val}</span>
      )
    },
    {
      key: 'date',
      label: 'Issue / Due Date',
      sortable: true,
      render: (val, row) => (
        <div className="text-[11px] text-slate-500">
          <div>Issued: {val}</div>
          <div className="text-slate-400">Due: {row.due}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'paid' ? 'success' : val === 'pending' ? 'warning' : 'danger'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'action',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Exporting PDF',
                message: `Downloading invoice ${row.id}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <CreditCard className="w-3 h-3" />
            <span>Financials & Client Invoicing</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Invoices & Billing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Client billing, invoice status, and receivables tracking for {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Generate Invoice</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Billed (Q4)</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              $20,200.00
            </div>
            <div className="text-[11px] text-slate-400">3 client accounts billed</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Paid Receivables</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              $15,950.00
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">79% collected</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Pending Due</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              $4,250.00
            </div>
            <div className="text-[11px] text-slate-400">Due within 14 days</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search invoice or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' }
              ]}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredInvoices} emptyMessage="No invoices found." />
      </Card>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Client Invoice"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateInvoice}>
              Issue Invoice
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Client Account
            </label>
            <select
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option>Metro Retail Distribution Co.</option>
              <option>Pacific Freight Express</option>
              <option>Harbor Cold Chain Logistics</option>
            </select>
          </div>

          <Input
            label="Invoice Amount ($ USD)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Description / Line Item
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide services rendered or monthly service period..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvoicesPage;
