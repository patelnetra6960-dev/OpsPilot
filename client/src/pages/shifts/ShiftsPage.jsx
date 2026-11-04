import { useState } from 'react';
import { CalendarCheck, Plus, Clock, Users, Search } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const ShiftsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New shift form state
  const [employeeName, setEmployeeName] = useState('David Kim');
  const [shiftDate, setShiftDate] = useState('2026-11-06');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:30');
  const [department, setDepartment] = useState('Field Logistics');
  const [site, setSite] = useState('Dock 4 Bay B');

  const [shifts, setShifts] = useState([
    {
      id: 'SH-901',
      employee: 'David Kim',
      department: 'Field Logistics',
      date: '2026-11-05',
      time_range: '08:00 - 16:30',
      hours: 8.0,
      site: 'Central Logistics Hub Bay 4',
      status: 'scheduled'
    },
    {
      id: 'SH-902',
      employee: 'Emily Davis',
      department: 'Fleet Operations',
      date: '2026-11-05',
      time_range: '07:30 - 16:00',
      hours: 8.0,
      site: 'North Terminal Gate 2',
      status: 'active'
    },
    {
      id: 'SH-903',
      employee: 'Carlos Mendez',
      department: 'Maintenance & Safety',
      date: '2026-11-05',
      time_range: '14:00 - 22:30',
      hours: 8.0,
      site: 'Depot Repair Workshop',
      status: 'scheduled'
    },
    {
      id: 'SH-904',
      employee: 'Aisha Patel',
      department: 'Quality Inspection',
      date: '2026-11-04',
      time_range: '08:00 - 16:30',
      hours: 8.0,
      site: 'Harbor Gate 12 Warehouse',
      status: 'completed'
    }
  ]);

  const handleCreateShift = (e) => {
    e.preventDefault();
    const newShift = {
      id: `SH-${Math.floor(1000 + Math.random() * 9000)}`,
      employee: employeeName,
      department: department,
      date: shiftDate,
      time_range: `${startTime} - ${endTime}`,
      hours: 8.0,
      site: site,
      status: 'scheduled'
    };

    setShifts([newShift, ...shifts]);
    setModalOpen(false);

    dispatch(
      addToast({
        type: 'success',
        title: 'Shift Scheduled',
        message: `Shift assigned to ${newShift.employee} on ${newShift.date}`
      })
    );
  };

  const filteredShifts = shifts.filter((s) => {
    const matchSearch =
      s.employee.toLowerCase().includes(search.toLowerCase()) ||
      s.site.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || s.department === filterDept;
    return matchSearch && matchDept;
  });

  const columns = [
    {
      key: 'employee',
      label: 'Staff Member',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.department}</div>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date & Timeslot',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{row.time_range}</span>
          </div>
        </div>
      )
    },
    {
      key: 'site',
      label: 'Site Location',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span>
    },
    {
      key: 'hours',
      label: 'Paid Hours',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val} hrs</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'active' ? 'primary' : val === 'completed' ? 'success' : 'neutral'}
          size="sm"
          className="capitalize"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'id',
      label: 'Action',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Shift Details',
                message: `Editing roster details for ${row.employee}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          Edit
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
            <span>Shift Scheduling & Clock-in Engine</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Shift Scheduling & Rota
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure shift rotas, enforce overtime rules, and track daily attendance for{' '}
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
            <span className="text-xs font-semibold text-slate-400">Scheduled Shifts Today</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {shifts.length}
            </div>
            <div className="text-[11px] text-slate-400">100% staff coverage</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active On-Duty</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {shifts.filter((s) => s.status === 'active').length || 1}
            </div>
            <div className="text-[11px] text-slate-400">Clocked in with GPS timestamp</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Weekly Total Hours</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">312.5 hrs</div>
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

        <Table columns={columns} data={filteredShifts} emptyMessage="No shifts found." />
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
            <Button variant="primary" onClick={handleCreateShift}>
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
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option>David Kim</option>
              <option>Emily Davis</option>
              <option>Carlos Mendez</option>
              <option>Aisha Patel</option>
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
        </form>
      </Modal>
    </div>
  );
};

export default ShiftsPage;
