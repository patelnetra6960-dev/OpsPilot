import React from 'react';
import { MapPin, Users, Clock, ShieldCheck } from 'lucide-react';
import { Card, Badge, Table } from '../../components/ui/index.js';
import { useSelector } from 'react-redux';
import { useTimesheetsQuery } from '../../features/shifts/index.js';

export const ManagerAttendancePage = () => {
  const { currentTenant } = useSelector((state) => state.tenant);
  const { data: records = [], isLoading } = useTimesheetsQuery();

  const formattedAttendance = records.map((att) => {
    const clockInStr = att.clock_in_time
      ? new Date(att.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const clockOutStr = att.clock_out_time
      ? new Date(att.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    const isOnDuty = !clockOutStr;

    return {
      id: att.id,
      name: att.worker?.full_name || 'Staff Member',
      role: att.worker?.department || 'Field Operations',
      clock_in: clockInStr,
      clock_out: clockOutStr || 'Active On Site',
      geofence: att.clock_in_geofence_verified ? 'Verified Inside Geofence' : 'Proximity Logged',
      is_geofence_ok: att.clock_in_geofence_verified,
      status: isOnDuty ? 'on_duty' : att.status || 'clocked_out',
      shift: att.shift?.location_name || 'Assigned Site'
    };
  });

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
      key: 'clock_out',
      label: 'Clock-Out Time',
      render: (val) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{val}</span>
      )
    },
    {
      key: 'geofence',
      label: 'Geofence Verification',
      render: (val, row) => (
        <span
          className={`text-xs flex items-center gap-1 font-semibold ${
            row.is_geofence_ok
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{val}</span>
        </span>
      )
    },
    {
      key: 'shift',
      label: 'Work Site Location',
      render: (val) => <span className="text-xs text-slate-500">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const isDuty = val === 'on_duty';
        const isApproved = val === 'approved';
        return (
          <Badge
            variant={isDuty ? 'success' : isApproved ? 'primary' : 'neutral'}
            size="sm"
            className="capitalize text-[10px]"
          >
            {val.replace('_', ' ')}
          </Badge>
        );
      }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Live Workforce Geofence Status
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {records.filter((r) => !r.clock_out_time).length} active field workers on site
          </span>
        </div>

        <Table
          columns={columns}
          data={formattedAttendance}
          isLoading={isLoading}
          emptyMessage="No active attendance records."
        />
      </Card>
    </div>
  );
};

export default ManagerAttendancePage;
