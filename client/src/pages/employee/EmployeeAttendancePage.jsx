import { useState, useEffect } from 'react';
import { MapPin, Play, Square } from 'lucide-react';
import { Card, Badge, Button, Table } from '../../components/ui/index.js';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';

export const EmployeeAttendancePage = () => {
  const dispatch = useDispatch();
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const history = [
    {
      date: '2026-11-04 (Today)',
      in_time: '08:15 AM',
      out_time: '--:--',
      hours: '5.2 hrs',
      location: 'Terminal Bay 4 (Geofenced)',
      status: 'active'
    },
    {
      date: '2026-11-03',
      in_time: '08:00 AM',
      out_time: '04:30 PM',
      hours: '8.5 hrs',
      location: 'Terminal Bay 4 (Geofenced)',
      status: 'approved'
    },
    {
      date: '2026-11-02',
      in_time: '07:58 AM',
      out_time: '04:00 PM',
      hours: '8.0 hrs',
      location: 'Central Workshop (Geofenced)',
      status: 'approved'
    }
  ];

  const columns = [
    {
      key: 'date',
      label: 'Shift Date',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-xs text-slate-900 dark:text-white">{val}</span>
      )
    },
    {
      key: 'in_time',
      label: 'Clock In',
      render: (val) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{val}</span>
      )
    },
    {
      key: 'out_time',
      label: 'Clock Out',
      render: (val) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{val}</span>
      )
    },
    {
      key: 'hours',
      label: 'Recorded Time',
      sortable: true,
      render: (val) => <span className="font-mono text-xs font-bold">{val}</span>
    },
    {
      key: 'location',
      label: 'GPS Location Verification',
      render: (val) => (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{val}</span>
        </span>
      )
    },
    {
      key: 'status',
      label: 'Timesheet Status',
      render: (val) => (
        <Badge
          variant={val === 'active' ? 'primary' : 'success'}
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
          Clock-In & Time Logs
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mobile punch clock records, geofenced timestamps, and historical shift hours.
        </p>
      </div>

      <Card variant="elevated" className="p-6 text-center max-w-md mx-auto space-y-4">
        <div className="text-3xl font-mono font-black text-slate-900 dark:text-white">
          {time.toLocaleTimeString()}
        </div>
        <p className="text-xs text-slate-400">
          {isClockedIn ? 'Currently clocked in since 08:15 AM' : 'Currently off duty'}
        </p>
        <Button
          variant={isClockedIn ? 'danger' : 'primary'}
          className="w-full"
          onClick={() => {
            setIsClockedIn(!isClockedIn);
            dispatch(
              addToast({
                type: isClockedIn ? 'warning' : 'success',
                title: isClockedIn ? 'Clocked Out' : 'Clocked In',
                message: `GPS coordinates captured at ${time.toLocaleTimeString()}`
              })
            );
          }}
        >
          {isClockedIn ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          <span>{isClockedIn ? 'Clock Out' : 'Clock In Now'}</span>
        </Button>
      </Card>

      <Card variant="default" className="p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Recent Shift Punch History
        </h2>
        <Table columns={columns} data={history} emptyMessage="No attendance history." />
      </Card>
    </div>
  );
};

export default EmployeeAttendancePage;
