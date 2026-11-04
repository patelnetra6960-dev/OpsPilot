import { useState } from 'react';
import { Send, Building2, CheckCircle2, FileText, Download, Plus, ShieldCheck } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const CustomerPortalPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [serviceType, setServiceType] = useState('repair');
  const [siteLocation, setSiteLocation] = useState('Metro Logistics Hub Bay 12');
  const [urgency, setUrgency] = useState('standard');
  const [description, setDescription] = useState('');

  // Active work orders for this customer
  const [orders, setOrders] = useState([
    {
      id: 'WO-8421',
      title: 'Hydraulic Loading Ramp Periodic Inspection',
      service_type: 'Maintenance',
      status: 'in_progress', // 'requested' | 'dispatched' | 'in_progress' | 'completed'
      step: 3,
      technician: 'David Kim (Senior Tech)',
      eta: 'Today at 02:30 PM',
      created_at: '2026-11-04 08:30'
    },
    {
      id: 'WO-8429',
      title: 'Cold Storage Ambient Temperature Sensor Diagnostic',
      service_type: 'Diagnostic & Repair',
      status: 'dispatched',
      step: 2,
      technician: 'Emily Davis',
      eta: 'Today at 04:00 PM',
      created_at: '2026-11-04 10:15'
    }
  ]);

  const invoices = [
    {
      id: 'INV-2026-104',
      date: '2026-11-01',
      amount: '$2,450.00',
      status: 'pending',
      desc: 'Monthly Scheduled Fleet & Bay Maintenance'
    },
    {
      id: 'INV-2026-092',
      date: '2026-10-01',
      amount: '$1,800.00',
      status: 'paid',
      desc: 'Quarterly Sensor Calibration & Safety Certifications'
    }
  ];

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newOrder = {
      id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      title: description.slice(0, 40) + '...',
      service_type: serviceType === 'repair' ? 'Emergency Repair' : 'Preventative Service',
      status: 'requested',
      step: 1,
      technician: 'Pending Operations Dispatch',
      eta: 'Under Review by Dispatch',
      created_at: 'Just now'
    };

    setOrders([newOrder, ...orders]);
    setRequestModalOpen(false);
    setDescription('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Service Request Submitted',
        message: `Order ${newOrder.id} logged. Operations team notified.`
      })
    );
  };

  const invoiceColumns = [
    {
      key: 'id',
      label: 'Invoice Code',
      sortable: true,
      render: (val) => <span className="font-mono font-bold text-xs">{val}</span>
    },
    {
      key: 'desc',
      label: 'Description',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">Issued on {row.date}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{val}</span>
      )
    },
    {
      key: 'status',
      label: 'Payment Status',
      render: (val) => (
        <Badge variant={val === 'paid' ? 'success' : 'warning'} size="sm" className="capitalize">
          {val}
        </Badge>
      )
    },
    {
      key: 'download',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Downloading Statement',
                message: `Retrieving signed PDF for ${row.id}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PDF</span>
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
            <Building2 className="w-3 h-3" />
            <span>Customer Client Hub</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Client Service Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome, {user?.full_name} • Partner: Metro Retail Distribution (Serviced by{' '}
            {currentTenant?.name})
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setRequestModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Request New Service</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Active Work Orders',
            value: orders.length,
            sub: 'Real-time tracking active',
            icon: Send,
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
          },
          {
            title: 'Jobs Completed',
            value: '18',
            sub: 'Past 30 days',
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
          },
          {
            title: 'SLA Fulfillment',
            value: '98.4%',
            sub: 'Average response < 45m',
            icon: ShieldCheck,
            color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60'
          },
          {
            title: 'Outstanding Balance',
            value: '$2,450',
            sub: 'Invoice due in 14 days',
            icon: FileText,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
          }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} variant="elevated" className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {kpi.title}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</div>
              </div>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${kpi.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Live Service Request Stepper Cards */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Active Service Orders & Real-Time Progress
            </h2>
            <p className="text-xs text-slate-500">
              Track work order stage, technician arrival ETA, and proof-of-work status.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {order.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {order.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {order.service_type} • Assigned: <strong>{order.technician}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="primary" size="sm">
                    {order.eta}
                  </Badge>
                </div>
              </div>

              {/* 4-Step Visual Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[11px]">
                {[
                  { step: 1, label: '1. Requested' },
                  { step: 2, label: '2. Dispatched' },
                  { step: 3, label: '3. In-Progress' },
                  { step: 4, label: '4. Completed' }
                ].map((s) => {
                  const isDone = order.step >= s.step;
                  const isCurrent = order.step === s.step;
                  return (
                    <div key={s.step} className="space-y-1.5">
                      <div
                        className={`h-2 rounded-full transition-colors ${
                          isDone ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                        } ${isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                      />
                      <span
                        className={`font-semibold block truncate ${
                          isDone ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices & Statements Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Billing Statements & Service Reports
            </h2>
            <p className="text-xs text-slate-500">
              Review and download official service documentation and invoices.
            </p>
          </div>
        </div>

        <Table columns={invoiceColumns} data={invoices} emptyMessage="No statements on record." />
      </Card>

      {/* Request New Service Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Submit New Service Request"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRequest}>
              Submit Request
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="repair">Emergency Equipment Repair</option>
              <option value="maintenance">Preventative Maintenance & Inspection</option>
              <option value="safety">Safety Audit & Compliance Certification</option>
              <option value="install">New Asset Installation</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site Location / Bay
            </label>
            <input
              type="text"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Urgency Level
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="standard">Standard (Within 24 Hours)</option>
              <option value="urgent">Urgent Priority (Within 4 Hours)</option>
              <option value="critical">Critical Outage (Immediate Dispatch)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Describe Required Service or Incident
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide equipment serial number, error codes, or symptoms..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerPortalPage;
