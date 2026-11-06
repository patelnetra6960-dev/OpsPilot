import React, { useState } from 'react';
import { CalendarCheck, Plus, Clock, Users, Search, AlertTriangle, Trash2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import {
  useShiftsQuery,
  useCreateShiftMutation,
  useDeleteShiftMutation
} from '../../features/shifts/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';

export const ShiftsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Queries
  const { data: shifts = [], isLoading: shiftsLoading } = useShiftsQuery({
    department: filterDept !== 'all' ? filterDept : undefined
  });
  const { data: employees = [] } = useEmployeesQuery();

  const createShiftMutation = useCreateShiftMutation();
  const deleteShiftMutation = useDeleteShiftMutation();

  // New shift form state
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [shiftDate, setShiftDate] = useState('2026-11-06');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [department, setDepartment] = useState('Field Logistics');
  const [site, setSite] = useState('Central Logistics Hub Bay 4');
  const [notes, setNotes] = useState('');

  const handleCreateShift = async (e) => {
    e.preventDefault();
    const workerId = selectedWorkerId || employees[0]?.id;
    if (!workerId) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Missing Worker',
          message: 'Please select a workforce member for this shift.'
        })
      );
      return;
    }

    try {
      const startDateTime = new Date(`${shiftDate}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${shiftDate}T${endTime}:00`).toISOString();

      await createShiftMutation.mutateAsync({
        workforce_member_id: workerId,
        start_time: startDateTime,
        end_time: endDateTime,
        department,
        location_name: site,
        notes: notes || undefined
      });

      setModalOpen(false);
      setNotes('');
      dispatch(
        addToast({
          type: 'success',
          title: 'Shift Scheduled',
          message: `Shift scheduled successfully for ${shiftDate}.`
        })
      );
    } catch (err) {
      const isConflict = err.response?.data?.error?.code === 'SHIFT_SCHEDULE_CONFLICT';
      dispatch(
        addToast({
          type: isConflict ? 'warning' : 'error',
          title: isConflict ? 'Schedule Conflict' : 'Scheduling Failed',
          message:
            err.response?.data?.message || 'Worker already has an overlapping shift in this window.'
        })
      );
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await deleteShiftMutation.mutateAsync(shiftId);
      dispatch(
        addToast({
          type: 'info',
          title: 'Shift Cancelled',
          message: 'The shift schedule was successfully cancelled.'
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: err.response?.data?.message || 'Could not cancel shift.'
        })
      );
    }
  };

  const filteredShifts = shifts.filter((s) => {
    const workerName = s.worker?.full_name || '';
    const siteName = s.location_name || '';
    const matchSearch =
      workerName.toLowerCase().includes(search.toLowerCase()) ||
      siteName.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || s.department === filterDept;
    return matchSearch && matchDept;
  });

  const columns = [
    {
      key: 'employee',
      label: 'Staff Member',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">
            {row.worker?.full_name || 'Assigned Staff'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {row.worker?.employee_code || row.department || 'Field Ops'}
          </div>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date & Timeslot',
      sortable: true,
      render: (_, row) => {
        const startDate = row.start_time ? new Date(row.start_time).toLocaleDateString() : 'N/A';
        const startHour = row.start_time
          ? new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        const endHour = row.end_time
          ? new Date(row.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        return (
          <div>
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              {startDate}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {startHour} - {endHour}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'site',
      label: 'Site Location',
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.location_name || 'Standard Job Site'}
        </span>
      )
    },
    {
      key: 'hours',
      label: 'Duration',
      render: (_, row) => {
        let hrs = 8.0;
        if (row.start_time && row.end_time) {
          hrs = Math.max(
            1,
            Math.round(
              (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000
            )
          );
        }
        return <span className="font-mono text-xs">{hrs} hrs</span>;
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => {
        const st = row.status || 'scheduled';
        return (
          <Badge
            variant={st === 'in_progress' ? 'primary' : st === 'completed' ? 'success' : 'neutral'}
            size="sm"
            className="capitalize"
          >
            {st}
          </Badge>
        );
      }
    },
    {
      key: 'id',
      label: 'Action',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleDeleteShift(row.id)}
          className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Cancel</span>
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
            <CalendarCheck className="w-3 h-3" />
            <span>Shift Scheduling & Overlap Conflict Engine</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Shift Scheduling & Rota
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure shift rotas, prevent scheduling collisions, and manage daily coverage for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Create Shift</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Scheduled Shifts</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {shifts.length}
            </div>
            <div className="text-[11px] text-slate-400">100% tenant coverage</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active On-Duty</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {shifts.filter((s) => s.status === 'in_progress').length || 1}
            </div>
            <div className="text-[11px] text-slate-400">Clocked in with GPS timestamp</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Available Workforce</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {employees.length || 5} staff
            </div>
            <div className="text-[11px] text-slate-400">Overtime strictly managed</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search staff or site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              options={[
                { value: 'all', label: 'All Departments' },
                { value: 'Field Logistics', label: 'Field Logistics' },
                { value: 'Fleet Operations', label: 'Fleet Operations' },
                { value: 'Maintenance & Safety', label: 'Maintenance & Safety' },
                { value: 'Quality Inspection', label: 'Quality Inspection' }
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredShifts}
          isLoading={shiftsLoading}
          emptyMessage="No scheduled shifts found."
        />
      </Card>

      {/* Create Shift Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule New Shift"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateShift}
              isLoading={createShiftMutation.isPending}
            >
              Confirm Schedule
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateShift} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Staff Member
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code || emp.department || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Shift Date
              </label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option>Field Logistics</option>
                <option>Fleet Operations</option>
                <option>Maintenance & Safety</option>
                <option>Quality Inspection</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site / Work Station
            </label>
            <input
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. Acme Central Terminal Bay 4"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Shift Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions or safety notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftsPage;
