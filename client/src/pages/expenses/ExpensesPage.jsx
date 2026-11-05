import { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  History,
  DollarSign
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import {
  useExpensesQuery,
  useExpenseStatsQuery,
  useSubmitExpenseMutation,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useReimburseExpenseMutation,
  EXPENSE_CATEGORIES
} from '../../features/finances/index.js';

export const ExpensesPage = () => {
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Submit Expense Form State
  const [formCategory, setFormCategory] = useState('equipment_maintenance');
  const [formAmount, setFormAmount] = useState('85.00');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formWorkOrderId, setFormWorkOrderId] = useState('');

  // Manager Actions State
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Query parameters
  const queryFilters = {
    search: search.trim() || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined
  };

  const { data: expenses = [], isLoading, refetch } = useExpensesQuery(queryFilters);
  const { data: stats = {} } = useExpenseStatsQuery();

  const submitMutation = useSubmitExpenseMutation();
  const approveMutation = useApproveExpenseMutation();
  const rejectMutation = useRejectExpenseMutation();
  const reimburseMutation = useReimburseExpenseMutation();

  const isManager = ['owner', 'admin', 'manager', 'superadmin'].includes(
    String(user?.role || '').toLowerCase()
  );

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!formDescription.trim() || !formAmount || Number(formAmount) <= 0) return;

    await submitMutation.mutateAsync({
      category: formCategory,
      amount: Number(formAmount),
      claim_date: formDate,
      description: formDescription.trim(),
      receipt_url: formReceiptUrl.trim() || null,
      work_order_id: formWorkOrderId.trim() || null
    });

    setSubmitModalOpen(false);
    setFormDescription('');
    setFormReceiptUrl('');
    refetch();
  };

  const handleApprove = async () => {
    if (!selectedExpense) return;
    await approveMutation.mutateAsync({
      id: selectedExpense.id,
      notes: approvalNotes.trim() || undefined
    });
    setApproveModalOpen(false);
    setSelectedExpense(null);
    setApprovalNotes('');
    refetch();
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason.trim()) return;
    await rejectMutation.mutateAsync({
      id: selectedExpense.id,
      rejection_reason: rejectionReason.trim()
    });
    setRejectModalOpen(false);
    setSelectedExpense(null);
    setRejectionReason('');
    refetch();
  };

  const handleReimburse = async (expense) => {
    await reimburseMutation.mutateAsync({
      id: expense.id,
      notes: 'Reimbursed through standard payroll'
    });
    refetch();
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'reimbursed':
        return 'primary';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'claim_code',
      label: 'Claim Code',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
            {val || row.id}
          </span>
          <div className="text-[10px] text-slate-400">{row.claim_date}</div>
        </div>
      )
    },
    {
      key: 'workforce_name',
      label: 'Staff Member',
      sortable: true,
      render: (val, row) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {val || row.employee || 'Assigned Technician'}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (val) => {
        const found = EXPENSE_CATEGORIES.find((c) => c.value === val);
        return (
          <Badge variant="outline" size="sm" className="capitalize text-xs">
            {found ? found.label : (val || '').replace(/_/g, ' ')}
          </Badge>
        );
      }
    },
    {
      key: 'description',
      label: 'Description',
      render: (val, row) => (
        <div>
          <div className="text-sm text-slate-700 dark:text-slate-300 max-w-sm truncate">{val}</div>
          {row.review_notes && (
            <div className="text-[11px] text-slate-500 italic mt-0.5">
              Review: {row.review_notes}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'receipt_url',
      label: 'Receipt',
      render: (val, row) =>
        val ? (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View
          </a>
        ) : row.receipt_attached ? (
          <span className="text-xs text-slate-400">Attached</span>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-slate-900 dark:text-white">
          ${Number(val || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={getStatusBadgeVariant(val)} size="sm" className="capitalize">
          {val}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 justify-end">
          {isManager && row.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 hover:bg-emerald-50 border-emerald-200 h-7 px-2"
                onClick={() => {
                  setSelectedExpense(row);
                  setApproveModalOpen(true);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 border-rose-200 h-7 px-2"
                onClick={() => {
                  setSelectedExpense(row);
                  setRejectModalOpen(true);
                }}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </>
          )}

          {isManager && row.status === 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 h-7 px-2"
              onClick={() => handleReimburse(row)}
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" /> Reimburse
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
            title="View History"
            onClick={() => {
              setSelectedExpense(row);
              setHistoryModalOpen(true);
            }}
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Field Expenses & Reimbursements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track technician field expenses, fuel receipts, multi-stage approvals and corporate
            reimbursements.
          </p>
        </div>
        <Button onClick={() => setSubmitModalOpen(true)} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Submit Expense Claim
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Claimed
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ${Number(stats.total_amount || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">{stats.total_count || 0} claims submitted</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Review
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                ${Number(stats.pending_amount || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/40 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.pending_count || 0} awaiting manager decision
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Approved
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                ${Number(stats.approved_amount || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.approved_count || 0} ready for payroll
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Reimbursed
              </p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                ${Number(stats.reimbursed_amount || 0).toFixed(2)}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.reimbursed_count || 0} settled claims
          </p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by claim code, description or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Claim Statuses' },
              { value: 'pending', label: 'Pending Review' },
              { value: 'approved', label: 'Approved' },
              { value: 'reimbursed', label: 'Reimbursed' },
              { value: 'rejected', label: 'Rejected' }
            ]}
          />

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Expense Categories' }, ...EXPENSE_CATEGORIES]}
          />
        </div>
      </Card>

      {/* Expense Ledger Table */}
      <Card className="overflow-hidden">
        <Table
          columns={columns}
          data={expenses}
          isLoading={isLoading}
          emptyMessage="No expense claims found matching the active criteria."
        />
      </Card>

      {/* Submit Expense Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Submit Expense Claim"
      >
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <Select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={EXPENSE_CATEGORIES}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ($ USD) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date Incurred *
              </label>
              <Input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Associated Work Order (Optional)
              </label>
              <Input
                placeholder="e.g. wo-1 or WO-2026-001"
                value={formWorkOrderId}
                onChange={(e) => setFormWorkOrderId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Attachment URL (Cloud / S3 Link)
            </label>
            <Input
              type="url"
              placeholder="https://storage.opspilot.internal/receipts/..."
              value={formReceiptUrl}
              onChange={(e) => setFormReceiptUrl(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Provide a valid document link or receipt photograph for validation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Description & Business Justification *
            </label>
            <textarea
              required
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Explain the necessity of this expense (e.g. emergency generator diesel for offsite repair)"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manager Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Expense Claim"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Confirm approval for claim{' '}
            <strong className="text-slate-900 dark:text-white font-mono">
              {selectedExpense?.claim_code}
            </strong>{' '}
            amounting to{' '}
            <strong className="text-emerald-600">
              ${Number(selectedExpense?.amount || 0).toFixed(2)}
            </strong>
            .
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Approval Notes (Optional)
            </label>
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Verified with work order job log"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manager Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Expense Claim"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Provide a mandatory rejection reason for claim{' '}
            <strong className="text-slate-900 dark:text-white font-mono">
              {selectedExpense?.claim_code}
            </strong>
            .
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rejection Reason *
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing itemized receipt breakdown or unauthorized per-diem limit"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending || rejectionReason.trim().length < 3}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Audit Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail - ${selectedExpense?.claim_code || 'Expense Claim'}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
            <div>
              <strong>Claim Date:</strong> {selectedExpense?.claim_date}
            </div>
            <div>
              <strong>Amount:</strong> ${Number(selectedExpense?.amount || 0).toFixed(2)}
            </div>
            <div>
              <strong>Staff Member:</strong>{' '}
              {selectedExpense?.workforce_name || selectedExpense?.employee || 'Staff'}
            </div>
            <div>
              <strong>Current Status:</strong>{' '}
              <Badge variant={getStatusBadgeVariant(selectedExpense?.status)} size="sm">
                {selectedExpense?.status}
              </Badge>
            </div>
            {selectedExpense?.review_notes && (
              <div>
                <strong>Review Notes:</strong> {selectedExpense?.review_notes}
              </div>
            )}
            {selectedExpense?.reviewed_at && (
              <div>
                <strong>Reviewed At:</strong>{' '}
                {new Date(selectedExpense.reviewed_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
