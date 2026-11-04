import { Clock, MapPin } from 'lucide-react';
import { Card, Badge, Table } from '../../components/ui/index.js';

export const EmployeeSchedulePage = () => {
  const weeklySchedule = [
    {
      day: 'Monday',
      date: '2026-11-02',
      shift: '08:00 - 16:30',
      hours: 8.0,
      site: 'Central Dock 4',
      status: 'completed'
    },
    {
      day: 'Tuesday',
      date: '2026-11-03',
      shift: '08:00 - 16:30',
      hours: 8.5,
      site: 'Central Dock 4',
      status: 'completed'
    },
    {
      day: 'Wednesday',
      date: '2026-11-04',
      shift: '08:00 - 16:30',
      hours: 8.0,
      site: 'Metro Central Bay 4',
      status: 'active'
    },
    {
      day: 'Thursday',
      date: '2026-11-05',
      shift: '08:00 - 16:30',
      hours: 8.0,
      site: 'Harbor Gate 12',
      status: 'scheduled'
    },
    {
      day: 'Friday',
      date: '2026-11-06',
      shift: '08:00 - 16:30',
      hours: 8.0,
      site: 'Central Dock 4',
      status: 'scheduled'
    }
  ];

  const columns = [
    {
      key: 'day',
      label: 'Day & Date',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.date}</div>
        </div>
      )
    },
    {
      key: 'shift',
      label: 'Shift Slot',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>{val}</span>
        </span>
      )
    },
    {
      key: 'site',
      label: 'Assigned Work Site',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{val}</span>
        </span>
      )
    },
    {
      key: 'hours',
      label: 'Paid Hours',
      sortable: true,
      render: (val) => <span className="font-mono text-xs font-bold">{val} hrs</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'active' ? 'primary' : val === 'completed' ? 'success' : 'neutral'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          My Shift Schedule
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your assigned shifts, station locations, and weekly hours rota.
        </p>
      </div>

      <Card variant="default" className="p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Current Week Roster</h2>
        <Table columns={columns} data={weeklySchedule} emptyMessage="No shifts scheduled." />
      </Card>
    </div>
  );
};

export default EmployeeSchedulePage;
