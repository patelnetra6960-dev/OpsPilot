import { MapPin } from 'lucide-react';
import { Card, Badge, Table } from '../../components/ui/index.js';
import { useSelector } from 'react-redux';

export const ManagerAttendancePage = () => {
  const { currentTenant } = useSelector((state) => state.tenant);

  const attendance = [
    {
      name: 'David Kim',
      role: 'Senior Technician',
      clock_in: '08:15 AM',
      geofence: 'Dock 4 (Inside)',
      status: 'on_duty',
      shift: '08:00 - 16:30'
    },
    {
      name: 'Emily Davis',
      role: 'Fleet Logistics Specialist',
      clock_in: '07:28 AM',
      geofence: 'North Terminal (Inside)',
      status: 'on_duty',
      shift: '07:30 - 16:00'
    },
    {
      name: 'Carlos Mendez',
      role: 'Maintenance Lead',
      clock_in: '08:02 AM',
      geofence: 'Central Depot (Inside)',
      status: 'on_break',
      shift: '08:00 - 16:30'
    },
    {
      name: 'Aisha Patel',
      role: 'Quality Inspector',
      clock_in: '--:--',
      geofence: 'Not clocked in yet',
      status: 'scheduled_later',
      shift: '14:00 - 22:30'
    }
  ];

  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400">{row.role}</div>
        </div>
      )
    },
    {
      key: 'clock_in',
      label: 'Clock-In Time',
      sortable: true,
      render: (val) => <span className="font-mono text-xs font-bold">{val}</span>
    },
    {
      key: 'geofence',
      label: 'Geofence Verification',
      render: (val) => (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{val}</span>
        </span>
      )
    },
    {
      key: 'shift',
      label: 'Roster Slot',
      render: (val) => <span className="text-xs text-slate-500">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'on_duty' ? 'success' : val === 'on_break' ? 'warning' : 'neutral'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val.replace('_', ' ')}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Team Attendance Live Monitor
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Real-time punch clock activity and GPS geofence compliance for {currentTenant?.name}.
        </p>
      </div>

      <Card variant="default" className="p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Today&apos;s Active Attendance Roster
        </h2>
        <Table columns={columns} data={attendance} emptyMessage="No attendance records found." />
      </Card>
    </div>
  );
};

export default ManagerAttendancePage;
