import { useState } from 'react';
import { Send, Plus, MapPin, User } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Badge, Button, Modal, Input } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const DispatchPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [modalOpen, setModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');

  // New Dispatch Form State
  const [orderCode, setOrderCode] = useState('WO-8498');
  const [jobTitle, setJobTitle] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [technician, setTechnician] = useState('David Kim');
  const [priority, setPriority] = useState('high');

  const [dispatches, setDispatches] = useState([
    {
      id: 'WO-8421',
      title: 'Hydraulic Ramp Safety Overhaul',
      site: 'Metro Central Bay 4',
      technician: 'David Kim',
      priority: 'high',
      status: 'on_site',
      time: 'Started 09:30 AM'
    },
    {
      id: 'WO-8424',
      title: 'Cold Storage Ambient Temp Recalibration',
      site: 'Apex Terminal Cold Room B',
      technician: 'Emily Davis',
      priority: 'critical',
      status: 'en_route',
      time: 'Dispatched 10:15 AM'
    },
    {
      id: 'WO-8430',
      title: 'Emergency Generator Load Bank Test',
      site: 'Harbor Gate 12 Power Station',
      technician: 'Carlos Mendez',
      priority: 'normal',
      status: 'pending',
      time: 'Awaiting Crew'
    },
    {
      id: 'WO-8415',
      title: 'Forklift Fleet Quarterly Fluid Flush',
      site: 'Acme Central Workshop',
      technician: 'Aisha Patel',
      priority: 'normal',
      status: 'completed',
      time: 'Finished 11:45 AM'
    }
  ]);

  const handleCreateDispatch = (e) => {
    e.preventDefault();
    if (!jobTitle.trim() || !siteAddress.trim()) return;

    const newDispatch = {
      id: orderCode || `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      title: jobTitle,
      site: siteAddress,
      technician: technician,
      priority: priority,
      status: 'pending',
      time: 'Just Dispatched'
    };

    setDispatches([newDispatch, ...dispatches]);
    setModalOpen(false);
    setJobTitle('');
    setSiteAddress('');
    setOrderCode(`WO-${Math.floor(1000 + Math.random() * 9000)}`);

    dispatch(
      addToast({
        type: 'success',
        title: 'Dispatch Created',
        message: `${newDispatch.id} allocated to ${technician}`
      })
    );
  };

  const handleAdvanceStatus = (id, currentStatus) => {
    const statusMap = {
      pending: 'en_route',
      en_route: 'on_site',
      on_site: 'completed'
    };

    const next = statusMap[currentStatus];
    if (!next) return;

    setDispatches(dispatches.map((d) => (d.id === id ? { ...d, status: next } : d)));

    dispatch(
      addToast({
        type: 'info',
        title: 'Work Order Updated',
        message: `${id} transitioned to ${next.replace('_', ' ')}`
      })
    );
  };

  const filteredDispatches =
    priorityFilter === 'all' ? dispatches : dispatches.filter((d) => d.priority === priorityFilter);

  const columns = [
    { id: 'pending', label: 'Pending Dispatch', color: 'border-amber-400' },
    { id: 'en_route', label: 'En Route', color: 'border-blue-500' },
    { id: 'on_site', label: 'On Site (Active)', color: 'border-indigo-600' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Send className="w-3 h-3" />
            <span>Real-Time Field Dispatch & Asset Lifecycle</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Operations Field Dispatch
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live technician assignment, asset maintenance, and real-time status kanban for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>

          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>New Dispatch</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const items = filteredDispatches.filter((d) => d.status === col.id);
          return (
            <div
              key={col.id}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                    <span>{col.label}</span>
                  </span>
                  <Badge variant="neutral" size="sm">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic">
                      No jobs in {col.label.toLowerCase()}
                    </div>
                  ) : (
                    items.map((job) => (
                      <div
                        key={job.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {job.id}
                          </span>
                          <Badge
                            variant={
                              job.priority === 'critical'
                                ? 'danger'
                                : job.priority === 'high'
                                  ? 'warning'
                                  : 'neutral'
                            }
                            size="sm"
                            className="capitalize text-[10px]"
                          >
                            {job.priority}
                          </Badge>
                        </div>

                        <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                          {job.title}
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{job.site}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {job.technician}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">{job.time}</span>
                          {col.id !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(job.id, col.id)}
                              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                            >
                              Advance →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Dispatch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Field Dispatch Order"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateDispatch}>
              Deploy Dispatch
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
          <Input
            label="Work Order Code"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
            required
          />

          <Input
            label="Job Title / Scope of Work"
            placeholder="e.g. Forklift Hydraulic Seal Replacement"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />

          <Input
            label="Destination Site Address"
            placeholder="e.g. Acme Terminal 2, Dock 14"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Emergency</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DispatchPage;
