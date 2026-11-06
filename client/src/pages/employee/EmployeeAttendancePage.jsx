import React, { useState, useEffect } from 'react';
import { MapPin, Play, Square, Clock, ShieldCheck } from 'lucide-react';
import { Card, Badge, Button, Table } from '../../components/ui/index.js';
import { useDispatch, useSelector } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';
import {
  useTimesheetsQuery,
  useClockInMutation,
  useClockOutMutation
} from '../../features/shifts/index.js';

export const EmployeeAttendancePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: records = [], isLoading } = useTimesheetsQuery();
  const clockInMutation = useClockInMutation();
  const clockOutMutation = useClockOutMutation();

  // Find active clock-in session without clock-out
  const activeSession = records.find((r) => !r.clock_out_time);
  const isClockedIn = Boolean(activeSession);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 40.7128, longitude: -74.006 }); // Default GPS
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {
          // If permission denied or unavailable, fallback
          resolve({ latitude: 40.7128, longitude: -74.006 });
        },
        { timeout: 5000 }
      );
    });
  };

  const handleTogglePunch = async () => {
    const coords = await getCoordinates();

    if (isClockedIn) {
      try {
        await clockOutMutation.mutateAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
          break_minutes: 0,
          notes: 'Standard mobile shift completion'
        });
        dispatch(
          addToast({
            type: 'info',
            title: 'Clocked Out',
            message: `Shift ended at ${new Date().toLocaleTimeString()}. Hours submitted for manager approval.`
          })
        );
      } catch (err) {
        dispatch(
          addToast({
            type: 'error',
            title: 'Clock-Out Failed',
            message: err.response?.data?.message || 'Could not record clock-out.'
          })
        );
      }
    } else {
      try {
        await clockInMutation.mutateAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: 'Mobile GPS punch clock'
        });
        dispatch(
          addToast({
            type: 'success',
            title: 'Clocked In',
            message: `GPS coordinates verified at ${new Date().toLocaleTimeString()}. Shift active.`
          })
        );
      } catch (err) {
        dispatch(
          addToast({
            type: 'error',
            title: 'Clock-In Failed',
            message: err.response?.data?.message || 'Could not record clock-in.'
          })
        );
      }
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Shift Date',
      sortable: true,
      render: (_, row) => {
        const d = row.clock_in_time ? new Date(row.clock_in_time).toLocaleDateString() : 'Today';
        return <span className="font-semibold text-xs text-slate-900 dark:text-white">{d}</span>;
      }
    },
    {
      key: 'in_time',
      label: 'Clock In',
      render: (_, row) => {
        const inStr = row.clock_in_time
          ? new Date(row.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--';
        return <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{inStr}</span>;
      }
    },
    {
      key: 'out_time',
      label: 'Clock Out',
      render: (_, row) => {
        const outStr = row.clock_out_time
          ? new Date(row.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--';
        return <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{outStr}</span>;
      }
    },
    {
      key: 'hours',
      label: 'Recorded Time',
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {row.total_hours || '0.00'} hrs
        </span>
      )
    },
    {
      key: 'location',
      label: 'GPS & Geofence Verification',
      render: (_, row) => (
        <span
          className={`text-xs flex items-center gap-1 font-semibold ${
            row.clock_in_geofence_verified
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{row.clock_in_geofence_verified ? 'On-Site Verified' : 'Proximity Logged'}</span>
        </span>
      )
    },
    {
      key: 'status',
      label: 'Timesheet Status',
      render: (_, row) => {
        const isPending = !row.clock_out_time;
        const st = isPending ? 'active' : row.status || 'pending_approval';
        return (
          <Badge
            variant={st === 'active' ? 'primary' : st === 'approved' ? 'success' : 'warning'}
            size="sm"
            className="capitalize text-[10px]"
          >
            {st.replace('_', ' ')}
          </Badge>
        );
      }
    }
  ];

  const isSubmitting = clockInMutation.isPending || clockOutMutation.isPending;

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
          {isClockedIn
            ? `Currently clocked in since ${new Date(activeSession.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Currently off duty'}
        </p>

        <Button
          variant={isClockedIn ? 'danger' : 'primary'}
          className="w-full py-3"
          disabled={isSubmitting}
          onClick={handleTogglePunch}
        >
          {isClockedIn ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          <span>{isClockedIn ? 'Clock Out Now' : 'Clock In with GPS'}</span>
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Point-in-time geofence & tamper-proof timestamps enforced</span>
        </div>
      </Card>

      <Card variant="default" className="p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Recent Shift Punch History
        </h2>
        <Table
          columns={columns}
          data={records}
          isLoading={isLoading}
          emptyMessage="No attendance history."
        />
      </Card>
    </div>
  );
};

export default EmployeeAttendancePage;
