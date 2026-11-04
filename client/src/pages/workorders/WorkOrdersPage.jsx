import { useState } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_WORK_ORDERS } from '../../data/prototypeData.js';

export const WorkOrdersPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [workOrders, setWorkOrders] = useState(PROTOTYPE_WORK_ORDERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Work Order form state
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('Metro Retail Distribution Co.');
  const [technician, setTechnician] = useState('David Kim');
  const [asset, setAsset] = useState('Hydraulic Ramp Lift #4');
  const [site, setSite] = useState('Dock 4 Bay B');
  const [priority, setPriority] = useState('high');

  const handleCreateWorkOrder = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newWo = {
      id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title,
      client: client,
      technician: technician,
      asset: asset,
      site: site,
      priority: priority,
      status: 'dispatched',
      scheduledWindow: 'Today 14:00 - 18:00',
      costEstimate: '$750.00',
      progress: 0,
      checklist: [
        { text: 'Perform safety walk-around and lockout-tagout', done: false },
        { text: 'Conduct initial diagnostic inspection', done: false },
        { text: 'Capture completion photos for tenant vault', done: false }
      ]
    };

    setWorkOrders([newWo, ...workOrders]);
    setModalOpen(false);
    setTitle('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Work Order Dispatched',
        message: `${newWo.id} deployed to ${technician}`
      })
    );
  };

  const handleToggleChecklist = (woId, checkIdx) => {
    setWorkOrders(
      workOrders.map((wo) => {
        if (wo.id === woId) {
          const updatedChecklist = wo.checklist.map((c, i) =>
            i === checkIdx ? { ...c, done: !c.done } : c
          );
          const completedCount = updatedChecklist.filter((c) => c.done).length;
          const newProgress = Math.round((completedCount / updatedChecklist.length) * 100);

          return {
            ...wo,
            checklist: updatedChecklist,
            progress: newProgress,
            status: newProgress === 100 ? 'completed' : 'in_progress'
          };
        }
        return wo;
      })
    );
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchSearch =
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.client.toLowerCase().includes(search.toLowerCase()) ||
      wo.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || wo.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      key: 'id',
      label: 'WO Code',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {val}
        </span>
      )
    },
    {
      key: 'title',
      label: 'Scope & Client',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400">
            Client: {row.client} • Site: {row.site}
          </div>
        </div>
      )
    },
    {
      key: 'technician',
      label: 'Technician',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-700 dark:text-slate-300">{val}</span>
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (val) => (
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{val}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div style={{ width: `${val}%` }} className="bg-indigo-600 h-full rounded-full" />
          </div>
        </div>
      )
    },
    {
      key: 'costEstimate',
      label: 'Cost Est.',
      sortable: true,
      render: (val) => <span className="font-mono text-xs font-bold">{val}</span>
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => (
        <Badge
          variant={val === 'critical' ? 'danger' : val === 'high' ? 'warning' : 'neutral'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'completed' ? 'success' : val === 'in_progress' ? 'primary' : 'warning'}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Wrench className="w-3 h-3" />
            <span>Field Work Orders & Asset Maintenance</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Work Order Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatch, cost estimation, checklist progress, and technician accountability for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Create Work Order</span>
        </Button>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-72">
            <Input
              placeholder="Search by code, title, client..."
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
                { value: 'all', label: 'All Statuses' },
                { value: 'dispatched', label: 'Dispatched' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'Under Review' },
                { value: 'completed', label: 'Completed' }
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredOrders}
          emptyMessage="No work orders matching search criteria."
        />
      </Card>

      {/* Interactive Checklists Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Active Field Checklists (Live Tech Execution)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workOrders.map((wo) => (
            <Card key={wo.id} variant="default" className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {wo.id}
                </span>
                <Badge variant="neutral" size="sm">
                  {wo.technician}
                </Badge>
              </div>

              <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                {wo.title}
              </div>

              <div className="space-y-2 pt-1">
                {wo.checklist.map((item, ci) => (
                  <div
                    key={ci}
                    onClick={() => handleToggleChecklist(wo.id, ci)}
                    className="flex items-center gap-2 cursor-pointer text-xs group"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      readOnly
                      className="rounded border-slate-300 text-indigo-600 pointer-events-none"
                    />
                    <span
                      className={`text-[11px] leading-tight ${
                        item.done
                          ? 'line-through text-slate-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Work Order Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Field Work Order"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateWorkOrder}>
              Dispatch Order
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
          <Input
            label="Work Order Title"
            placeholder="e.g. Hydraulic Ram Seal Replacement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Client
              </label>
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option>Metro Retail Distribution Co.</option>
                <option>Pacific Freight Express</option>
                <option>Harbor Cold Chain Logistics</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Field Technician
              </label>
              <select
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option>David Kim</option>
                <option>Emily Davis</option>
                <option>Carlos Mendez</option>
                <option>Aisha Patel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Asset / Equipment"
              placeholder="e.g. Model HR-400 Lift"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />

            <Input
              label="Site Location"
              placeholder="e.g. Bay 4 Loading Dock"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
          </div>

          <Select
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical Emergency' }
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};

export default WorkOrdersPage;
