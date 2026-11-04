import { useState } from 'react';
import { Receipt, Plus, Search, UploadCloud, Check } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_EXPENSES } from '../../data/prototypeData.js';

export const ExpensesPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);

  const [expenses, setExpenses] = useState(PROTOTYPE_EXPENSES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Expense form state
  const [category, setCategory] = useState('Equipment Maintenance');
  const [amount, setAmount] = useState('85.00');
  const [description, setDescription] = useState('');

  const handleCreateExpense = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const newExp = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      employee: user?.full_name || 'David Kim',
      category: category,
      description: description,
      amount: `$${Number(amount).toFixed(2)}`,
      receiptAttached: true,
      status: 'pending',
      workOrderId: 'WO-8421'
    };

    setExpenses([newExp, ...expenses]);
    setModalOpen(false);
    setDescription('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Expense Claim Submitted',
        message: `${newExp.id} submitted for manager review`
      })
    );
  };

  const handleApprove = (expId) => {
    setExpenses(expenses.map((e) => (e.id === expId ? { ...e, status: 'approved' } : e)));
    dispatch(
      addToast({
        type: 'success',
        title: 'Expense Approved',
        message: `${expId} marked for payroll reimbursement`
      })
    );
  };

  const handleReject = (expId) => {
    setExpenses(expenses.map((e) => (e.id === expId ? { ...e, status: 'rejected' } : e)));
    dispatch(
      addToast({
        type: 'warning',
        title: 'Expense Flagged',
        message: `${expId} returned for missing documentation`
      })
    );
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.employee.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      key: 'id',
      label: 'Claim Code',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
            {val}
          </span>
          <div className="text-[10px] text-slate-400">{row.date}</div>
        </div>
      )
    },
    {
      key: 'employee',
      label: 'Staff Member',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{val}</span>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => (
        <Badge variant="neutral" size="sm" className="text-[10px]">
          {val}
        </Badge>
      )
    },
    {
      key: 'description',
      label: 'Expense Purpose',
      render: (val, row) => (
        <div>
          <div className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs">{val}</div>
          {row.receiptAttached && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" />
              <span>Receipt Verified</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{val}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'approved' ? 'success' : val === 'rejected' ? 'danger' : 'warning'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Review',
      render: (_, row) =>
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApprove(row.id)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              Approve
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleReject(row.id)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Processed</span>
        )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Receipt className="w-3 h-3" />
            <span>Field Expenses & Reimbursements</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Operational Expenses
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit, review, and approve field technician out-of-pocket expenses and fleet fuel for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Submit Expense</span>
        </Button>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-72">
            <Input
              placeholder="Search by description or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'approved', label: 'Approved' },
                { value: 'pending', label: 'Pending Review' },
                { value: 'rejected', label: 'Rejected' }
              ]}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredExpenses} emptyMessage="No expense claims found." />
      </Card>

      {/* Submit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Field Expense Claim"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateExpense}>
              Submit for Approval
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
          <Select
            label="Expense Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'Fleet Fuel', label: 'Fleet Fuel' },
              { value: 'Equipment Maintenance', label: 'Equipment Maintenance & Parts' },
              { value: 'Tooling', label: 'Tooling & Safety Hardware' },
              { value: 'Meals & Travel', label: 'Meals & Per-Diem Travel' }
            ]}
          />

          <Input
            label="Amount ($ USD)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Purpose / Description
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide merchant name, business justification, or linked work order..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center space-y-1 hover:border-indigo-500 transition cursor-pointer">
            <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attach Receipt Photo or PDF
            </div>
            <div className="text-[10px] text-slate-400">Up to 10MB (JPEG, PNG, PDF)</div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
