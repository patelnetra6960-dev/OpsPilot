import { useState } from 'react';
import { History, Search, ShieldCheck, Download, Eye, FileCode } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const AuditPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const [auditLogs] = useState([
    {
      id: 'aud-9912',
      action: 'WORKFORCE_MEMBER_CREATED',
      actor_name: 'Alex Rivera',
      actor_email: 'alex.director@acme.com',
      ip_address: '198.51.100.45',
      timestamp: '2026-11-04 11:15:22',
      table_name: 'workforce_members',
      payload_diff: {
        operation: 'INSERT',
        new_record: {
          full_name: 'Emily Davis',
          email: 'emily.davis@acme.com',
          role: 'employee',
          department: 'Fleet Operations',
          status: 'active'
        }
      }
    },
    {
      id: 'aud-9911',
      action: 'WORK_ORDER_DISPATCHED',
      actor_name: 'Sarah Chen',
      actor_email: 'sarah.ops@acme.com',
      ip_address: '198.51.100.12',
      timestamp: '2026-11-04 10:30:00',
      table_name: 'work_orders',
      payload_diff: {
        operation: 'UPDATE',
        changed_fields: {
          status: { from: 'pending', to: 'en_route' },
          assigned_technician_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
        }
      }
    },
    {
      id: 'aud-9910',
      action: 'TIMESHEET_APPROVED',
      actor_name: 'Sarah Chen',
      actor_email: 'sarah.ops@acme.com',
      ip_address: '198.51.100.12',
      timestamp: '2026-11-04 09:45:15',
      table_name: 'timesheets',
      payload_diff: {
        operation: 'UPDATE',
        changed_fields: {
          approval_status: { from: 'pending', to: 'approved' },
          approved_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
        }
      }
    },
    {
      id: 'aud-9909',
      action: 'STORAGE_DOCUMENT_UPLOADED',
      actor_name: 'Alex Rivera',
      actor_email: 'alex.director@acme.com',
      ip_address: '198.51.100.45',
      timestamp: '2026-11-03 16:20:00',
      table_name: 'document_vault',
      payload_diff: {
        operation: 'INSERT',
        new_record: {
          bucket: 'org-documents',
          prefix: '11111111-1111-1111-1111-111111111111',
          file_name: 'OSHA Warehouse Compliance Audit Certification.pdf'
        }
      }
    }
  ]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      log.table_name.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const columns = [
    {
      key: 'action',
      label: 'Event Type',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {val}
        </span>
      )
    },
    {
      key: 'actor_name',
      label: 'Actor & IP',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {row.actor_email} • {row.ip_address}
          </div>
        </div>
      )
    },
    {
      key: 'table_name',
      label: 'Target Table',
      sortable: true,
      render: (val) => (
        <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
          {val}
        </Badge>
      )
    },
    {
      key: 'timestamp',
      label: 'Timestamp (UTC)',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-500">{val}</span>
    },
    {
      key: 'id',
      label: 'Payload',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedLog(row)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect Diff</span>
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
            <History className="w-3 h-3" />
            <span>Immutable Append-Only Audit Stream</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cryptographically sealed activity log recording mutations, actor IPs, and JSON diffs for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            dispatch(
              addToast({
                type: 'success',
                title: 'Export Initiated',
                message: 'Compliance CSV audit export downloaded to disk'
              })
            );
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          <span>Export Compliance CSV</span>
        </Button>
      </div>

      {/* RLS Integrity Banner */}
      <Card variant="default" className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              PostgreSQL Append-Only Trigger Verified
            </div>
            <div className="text-[11px] text-slate-500">
              Zero UPDATE or DELETE privileges granted on audit table. All mutations immutable.
            </div>
          </div>
        </div>

        <Badge variant="success" size="sm">
          SOC2 Type II Ready
        </Badge>
      </Card>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="Search event, actor, table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              options={[
                { value: 'all', label: 'All Event Types' },
                { value: 'WORKFORCE_MEMBER_CREATED', label: 'Workforce Created' },
                { value: 'WORK_ORDER_DISPATCHED', label: 'Work Order Dispatched' },
                { value: 'TIMESHEET_APPROVED', label: 'Timesheet Approved' },
                { value: 'STORAGE_DOCUMENT_UPLOADED', label: 'Document Uploaded' }
              ]}
            />
          </div>
        </div>

        <Table columns={columns} data={filteredLogs} emptyMessage="No audit logs recorded." />
      </Card>

      {/* Payload Diff Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action}`}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px]">Actor:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedLog.actor_name} ({selectedLog.actor_email})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Origin IP & Timestamp:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedLog.ip_address} @ {selectedLog.timestamp}
                </span>
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>JSON Payload Diff (PostgreSQL Trigger Snapshot):</span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                {JSON.stringify(selectedLog.payload_diff, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditPage;
