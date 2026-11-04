import { useState } from 'react';
import { Inbox, Search, ArrowRight, User } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_SERVICE_REQUESTS } from '../../data/prototypeData.js';

export const ServiceRequestsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [requests, setRequests] = useState(PROTOTYPE_SERVICE_REQUESTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [convertModalRequest, setConvertModalRequest] = useState(null);
  const [assignedTech, setAssignedTech] = useState('David Kim');

  const handleConvert = (e) => {
    e.preventDefault();
    if (!convertModalRequest) return;

    const newWoId = `WO-${Math.floor(1000 + Math.random() * 9000)}`;

    setRequests(
      requests.map((r) =>
        r.id === convertModalRequest.id
          ? {
              ...r,
              status: 'converted',
              convertedWorkOrderId: newWoId
            }
          : r
      )
    );

    dispatch(
      addToast({
        type: 'success',
        title: 'Work Order Dispatched',
        message: `${convertModalRequest.id} converted into ${newWoId} and assigned to ${assignedTech}`
      })
    );

    setConvertModalRequest(null);
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.client.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      key: 'id',
      label: 'Request Code',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {val}
        </span>
      )
    },
    {
      key: 'client',
      label: 'Client Account',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{row.contact}</span>
          </div>
        </div>
      )
    },
    {
      key: 'title',
      label: 'Reported Issue',
      render: (val, row) => (
        <div>
          <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.location}</div>
        </div>
      )
    },
    {
      key: 'urgency',
      label: 'SLA Urgency',
      sortable: true,
      render: (val) => (
        <Badge
          variant={val === 'critical' ? 'danger' : val === 'urgent' ? 'warning' : 'neutral'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Lifecycle Stage',
      render: (val, row) => (
        <div>
          <Badge
            variant={val === 'converted' ? 'success' : val === 'assigned' ? 'primary' : 'warning'}
            size="sm"
            className="capitalize text-[10px]"
          >
            {val.replace('_', ' ')}
          </Badge>
          {row.convertedWorkOrderId && (
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              → {row.convertedWorkOrderId}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) =>
        row.status !== 'converted' ? (
          <button
            type="button"
            onClick={() => setConvertModalRequest(row)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
          >
            <span>Dispatch WO</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">Converted</span>
        )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Inbox className="w-3 h-3" />
            <span>Customer Service Ingestion Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Service Request Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Triage client maintenance tickets and convert verified issues into dispatched work
            orders for {currentTenant?.name}.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-72">
            <Input
              placeholder="Search request, client, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Stages' },
                { value: 'new', label: 'New / Unassigned' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'converted', label: 'Converted to Work Order' }
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredRequests}
          emptyMessage="No service requests pending triage."
        />
      </Card>

      {/* Convert to Work Order Modal */}
      <Modal
        isOpen={Boolean(convertModalRequest)}
        onClose={() => setConvertModalRequest(null)}
        title="Convert Request to Field Work Order"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConvertModalRequest(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConvert}>
              Confirm Dispatch
            </Button>
          </div>
        }
      >
        {convertModalRequest && (
          <form onSubmit={handleConvert} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">
                Source Ticket: {convertModalRequest.id}
              </span>
              <div className="font-bold text-slate-900 dark:text-white">
                {convertModalRequest.title}
              </div>
              <div className="text-[11px] text-slate-500">
                Client: {convertModalRequest.client} • Location: {convertModalRequest.location}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Assign Lead Field Technician
              </label>
              <select
                value={assignedTech}
                onChange={(e) => setAssignedTech(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option>David Kim (Senior Tech)</option>
                <option>Emily Davis (Fleet Logistics)</option>
                <option>Carlos Mendez (Maintenance Lead)</option>
                <option>Aisha Patel (Quality & Safety)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Scheduled SLA Dispatch Window
              </label>
              <input
                type="text"
                defaultValue="Today (Within 2 Hours)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ServiceRequestsPage;
