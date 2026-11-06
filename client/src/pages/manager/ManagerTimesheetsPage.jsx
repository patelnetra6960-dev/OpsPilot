import React, { useState } from 'react';
import { Card, Badge, Input, Table } from '../../components/ui/index.js';
import { useDispatch, useSelector } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';
import {
  useTimesheetsQuery,
  useApproveTimesheetMutation
} from '../../features/shifts/index.js';

export const ManagerTimesheetsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: timesheets = [], isLoading } = useTimesheetsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined
  });
  const approveMutation = useApproveTimesheetMutation();

  const handleApprove = async (id, name) => {
    try {
      await approveMutation.mutateAsync({ id, status: 'approved' });
      dispatch(
        addToast({
          type: 'success',
          title: 'Timesheet Approved',
          message: `Hours successfully approved for ${name}.`
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Approval Failed',
          message: err.response?.data?.message || 'Could not approve timesheet.'
        })
      );
    }
  };

  const handleReject = async (id, name) => {
    try {
      await approveMutation.mutateAsync({
        id,
        status: 'rejected',
        notes: 'Manager requested revision'
      });
      dispatch(
        addToast({
          type: 'warning',
          title: 'Timesheet Rejected',
          message: `Timesheet flagged and returned for revision to ${name}.`
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Rejection Failed',
          message: err.response?.data?.message || 'Could not reject timesheet.'
        })
      );
    }
  };

  const filtered = timesheets.filter((t) => {
    const workerName = t.worker?.full_name || t.employee || '';
    const notes = t.notes || '';
    return (
      workerName.toLowerCase().includes(search.toLowerCase()) ||
      notes.toLowerCase().includes(search.toLowerCase())
    );
  });

  const columns = [
    {
      key: 'employee',
      label: 'Technician',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">
            {row.worker?.full_name || 'Staff Member'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {row.worker?.employee_code || row.worker?.department || 'Operations'}
          </div>
        </div>
      )
    },
    {
      key: 'shift_date',
      label: 'Shift Date',
      sortable: true,
      render: (_, row) => {
        const d = row.clock_in_time ? new Date(row.clock_in_time).toLocaleDateString() : 'Today';
        return <span className="font-mono text-xs">{d}</span>;
      }
    },
    {
      key: 'hours_worked',
      label: 'Total Hours',
      sortable: true,
      render: (_, row) => (
        <div>
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
            {row.total_hours || '0.00'} hrs
          </span>
          {row.break_minutes > 0 && (
            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
              ({row.break_minutes}m break)
            </span>
          )}
        </div>
      )
    },
    {
      key: 'geofence',
      label: 'Geofence Verification',
      render: (_, row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            row.clock_in_geofence_verified
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
          }`}
        >
          {row.clock_in_geofence_verified ? 'Verified On-Site' : 'Proximity Warning'}
        </span>
      )
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (val) => (
        <span className="text-xs text-slate-500 italic truncate max-w-xs block">
          {val || 'Standard shift log'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const st = row.status || 'pending_approval';
        const isApproved = st === 'approved';
        const isRejected = st === 'rejected';
        return (
          <Badge
            variant={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
            size="sm"
            className="capitalize text-[10px]"
          >
            {st.replace('_', ' ')}
          </Badge>
        );
      }
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => {
        const workerName = row.worker?.full_name || 'Technician';
        return row.status === 'pending_approval' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() => handleApprove(row.id, workerName)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Approve
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() => handleReject(row.id, workerName)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Processed</span>
        );
      }
    }
  ];

  const pendingCount = timesheets.filter((t) => t.status === 'pending_approval').length;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-64">
            <Input
              placeholder="Search technician or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <span className="text-xs text-slate-400 font-medium">
              {pendingCount} pending approval
            </span>
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No timesheets in record."
        />
      </Card>
    </div>
  );
};

export default ManagerTimesheetsPage;
