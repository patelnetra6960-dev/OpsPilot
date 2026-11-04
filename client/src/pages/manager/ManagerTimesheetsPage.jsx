import { useState } from 'react';
import { Card, Badge, Input, Table } from '../../components/ui/index.js';
import { useDispatch, useSelector } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';

export const ManagerTimesheetsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [search, setSearch] = useState('');

  const [timesheets, setTimesheets] = useState([
    {
      id: 'TS-801',
      employee: 'David Kim',
      shift_date: '2026-11-04',
      hours_worked: 8.5,
      overtime: 0.5,
      shift_type: 'Day Shift (08:00 - 16:30)',
      notes: 'Extended shift to finalize emergency hydraulic pump repair.',
      status: 'pending'
    },
    {
      id: 'TS-802',
      employee: 'Emily Davis',
      shift_date: '2026-11-04',
      hours_worked: 9.0,
      overtime: 1.0,
      shift_type: 'Day Shift (07:30 - 16:30)',
      notes: 'Highway delay during dispatch return trip.',
      status: 'pending'
    },
    {
      id: 'TS-803',
      employee: 'Carlos Mendez',
      shift_date: '2026-11-03',
      hours_worked: 8.0,
      overtime: 0.0,
      shift_type: 'Standard Shift (08:00 - 16:00)',
      notes: 'Completed scheduled preventative maintenance on forklift fleet.',
      status: 'approved'
    }
  ]);

  const handleApprove = (id, name) => {
    setTimesheets(timesheets.map((t) => (t.id === id ? { ...t, status: 'approved' } : t)));
    dispatch(
      addToast({
        type: 'success',
        title: 'Timesheet Approved',
        message: `Hours approved for ${name}`
      })
    );
  };

  const handleReject = (id, name) => {
    setTimesheets(timesheets.map((t) => (t.id === id ? { ...t, status: 'rejected' } : t)));
    dispatch(
      addToast({
        type: 'warning',
        title: 'Timesheet Flagged',
        message: `Revision requested for ${name}`
      })
    );
  };

  const filtered = timesheets.filter(
    (t) =>
      t.employee.toLowerCase().includes(search.toLowerCase()) ||
      t.shift_type.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'employee',
      label: 'Technician',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.shift_type}</div>
        </div>
      )
    },
    {
      key: 'shift_date',
      label: 'Shift Date',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    {
      key: 'hours_worked',
      label: 'Total Hours',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
            {val} hrs
          </span>
          {row.overtime > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 ml-1.5">
              (+{row.overtime} OT)
            </span>
          )}
        </div>
      )
    },
    {
      key: 'notes',
      label: 'Work Description',
      render: (val) => (
        <span className="text-xs text-slate-500 italic truncate max-w-xs block">{val}</span>
      )
    },
    {
      key: 'status',
      label: 'Approval Status',
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
      key: 'id',
      label: 'Actions',
      render: (_, row) =>
        row.status === 'pending' ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApprove(row.id, row.employee)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Approve
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleReject(row.id, row.employee)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
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
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Timesheet Approvals
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Review, approve, or flag shift hours and overtime submitted by field staff for{' '}
          {currentTenant?.name}.
        </p>
      </div>

      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-64">
            <Input
              placeholder="Search technician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs"
            />
          </div>
          <span className="text-xs text-slate-400">
            {timesheets.filter((t) => t.status === 'pending').length} pending approval
          </span>
        </div>

        <Table columns={columns} data={filtered} emptyMessage="No timesheets in record." />
      </Card>
    </div>
  );
};

export default ManagerTimesheetsPage;
