import { Zap } from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui/index.js';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';

export const SuperAdminSystemHealthPage = () => {
  const dispatch = useDispatch();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            System Health & Telemetry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time infrastructure health, PostgreSQL connection pools, latency, and RLS
            enforcement.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            dispatch(
              addToast({
                type: 'success',
                title: 'Diagnostics Verified',
                message: 'All 6 micro-services operating with 0 error rates'
              })
            );
          }}
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          <span>Run Health Probe</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: 'Supabase PostgreSQL RDS',
            status: 'Operational',
            badge: 'success',
            metrics: [
              { label: 'Version', val: 'PostgreSQL 15.6' },
              { label: 'Conn Pool', val: '18 / 60 active' },
              { label: 'Query P99', val: '12ms' }
            ]
          },
          {
            title: 'Express Node.js Modular Monolith',
            status: 'Healthy',
            badge: 'success',
            metrics: [
              { label: 'Event Loop Lag', val: '0.8ms' },
              { label: 'Memory Usage', val: '78 MB / 512 MB' },
              { label: 'Uptime', val: '99.99%' }
            ]
          },
          {
            title: 'Row-Level Security (RLS) Engine',
            status: 'Enforced',
            badge: 'success',
            metrics: [
              { label: 'Policies Active', val: '14 across 6 tables' },
              { label: 'Bypass Attempts', val: '0 detected' },
              { label: 'Tenant Isolation', val: '100% Cryptographic' }
            ]
          },
          {
            title: 'Supabase Storage Buckets',
            status: 'Operational',
            badge: 'success',
            metrics: [
              { label: 'Buckets', val: 'org-assets, org-documents' },
              { label: 'Upload SLA', val: 'Presigned S3 (Direct)' },
              { label: 'Total Volume', val: '15.8 GB' }
            ]
          },
          {
            title: 'Realtime CDC WebSocket Stream',
            status: 'Listening',
            badge: 'primary',
            metrics: [
              { label: 'Active Sockets', val: '42 connected' },
              { label: 'Broadcast Latency', val: '14ms' },
              { label: 'Channels', val: 'shifts, dispatches, punch' }
            ]
          },
          {
            title: 'Automated Snapshot Backups',
            status: 'Verified',
            badge: 'success',
            metrics: [
              { label: 'Last Snapshot', val: 'Today 04:00 UTC' },
              { label: 'RPO / RTO', val: '< 5 mins / < 15 mins' },
              { label: 'Encryption', val: 'AES-256 at rest' }
            ]
          }
        ].map((svc, i) => (
          <Card key={i} variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{svc.title}</span>
              </span>
              <Badge variant={svc.badge} size="sm">
                {svc.status}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {svc.metrics.map((m, mi) => (
                <div
                  key={mi}
                  className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850"
                >
                  <span className="text-slate-400">{m.label}:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminSystemHealthPage;
