import React, { useState } from 'react';
import { Send, Plus, MapPin, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Badge, Button, Modal, Input, Card } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import {
  useWorkOrdersQuery,
  useCreateWorkOrderMutation,
  useChangeWorkOrderStatusMutation
} from '../../features/services/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';

export const DispatchPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [modalOpen, setModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Queries
  const { data: workOrders = [], isLoading } = useWorkOrdersQuery();
  const { data: employees = [] } = useEmployeesQuery();

  const createMutation = useCreateWorkOrderMutation();
  const changeStatusMutation = useChangeWorkOrderStatusMutation();

  // New Dispatch Form State
  const [jobTitle, setJobTitle] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState('');

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!jobTitle.trim() || !siteAddress.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: jobTitle,
        description: description || `Field dispatch to ${siteAddress}`,
        service_address: siteAddress,
        priority: priority.toLowerCase(),
        assigned_to_id: assignedEmployeeId || employees[0]?.id || undefined,
        status: 'dispatched'
      });

      setModalOpen(false);
      setJobTitle('');
      setSiteAddress('');
      setDescription('');

      dispatch(
        addToast({
          type: 'success',
          title: 'Work Order Dispatched',
          message: `Dispatch order successfully created and allocated.`
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Dispatch Failed',
          message: err.response?.data?.message || 'Could not create work order dispatch.'
        })
      );
    }
  };

  const handleAdvanceStatus = async (id, currentStatus) => {
    const statusMap = {
      scheduled: 'dispatched',
      dispatched: 'en_route',
      en_route: 'in_progress',
      in_progress: 'completed'
    };

    const next = statusMap[currentStatus?.toLowerCase()];
    if (!next) return;

    try {
      await changeStatusMutation.mutateAsync({
        id,
        status: next,
        notes: `Dispatcher updated status to ${next.toUpperCase()}`
      });

      dispatch(
        addToast({
          type: 'info',
          title: 'Status Updated',
          message: `Work Order advanced to ${next.toUpperCase().replace('_', ' ')}`
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err.response?.data?.message || 'Could not advance status.'
        })
      );
    }
  };

  const filteredDispatches = workOrders.filter((wo) => {
    if (priorityFilter === 'all') return true;
    return wo.priority?.toLowerCase() === priorityFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/80 mb-1">
            <Send className="w-3 h-3" />
            <span>Real-time Field Operations Dispatch</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Field Dispatch Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor real-time field deployments, route tracking, and technician statuses for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent / Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>New Dispatch</span>
          </Button>
        </div>
      </div>

      {/* Dispatch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDispatches.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Active Dispatches
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create a new field work order dispatch using the button above.
            </p>
          </div>
        ) : (
          filteredDispatches.map((dispatchItem) => {
            const st = dispatchItem.status?.toLowerCase() || 'scheduled';
            const isCompleted = st === 'completed' || st === 'approved' || st === 'invoiced';
            const priorityClass =
              dispatchItem.priority === 'urgent' || dispatchItem.priority === 'critical'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                : dispatchItem.priority === 'high'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

            return (
              <Card
                key={dispatchItem.id}
                variant="elevated"
                className="p-5 flex flex-col justify-between hover:shadow-md transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {dispatchItem.work_order_code || `WO-${dispatchItem.id.slice(0, 6)}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${priorityClass}`}
                    >
                      {dispatchItem.priority || 'Normal'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
                    {dispatchItem.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {dispatchItem.service_address || 'Job Site Location'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>
                        {dispatchItem.assigned_to?.full_name ||
                          dispatchItem.technician ||
                          'Assigned Field Tech'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Badge
                    variant={
                      st === 'in_progress'
                        ? 'primary'
                        : isCompleted
                          ? 'success'
                          : st === 'en_route'
                            ? 'warning'
                            : 'neutral'
                    }
                    size="sm"
                    className="capitalize text-[10px]"
                  >
                    {st.replace('_', ' ')}
                  </Badge>

                  {!isCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdvanceStatus(dispatchItem.id, st)}
                      className="text-[11px] h-7"
                    >
                      Advance Status
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* New Dispatch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Field Operations Dispatch"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateDispatch}
              isLoading={createMutation.isPending}
            >
              Deploy Dispatch
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Work Order / Job Title
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Hydraulic Ramp Safety Overhaul"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site Address / Location
            </label>
            <input
              type="text"
              required
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="e.g. Metro Central Bay 4 Terminal"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Field Technician
              </label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Priority SLA
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="urgent">Urgent (4hr SLA)</option>
                <option value="high">High (8hr SLA)</option>
                <option value="medium">Medium (24hr SLA)</option>
                <option value="low">Low (48hr SLA)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Dispatch Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide technician notes, gate codes, safety PPE requirements..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DispatchPage;
