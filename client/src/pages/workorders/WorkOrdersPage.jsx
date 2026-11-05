import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Wrench,
  Search,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  Eye,
  Camera,
  Trash2,
  MapPin,
  CheckSquare,
  Square,
  Star,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useWorkOrdersQuery,
  useWorkOrderDetailQuery,
  useCreateWorkOrderMutation,
  useAssignTechnicianMutation,
  useScheduleWorkOrderMutation,
  useChangeWorkOrderStatusMutation,
  useAddChecklistMutation,
  useToggleChecklistMutation,
  useDeleteChecklistMutation,
  useAddJobNoteMutation,
  useAddPhotoMutation,
  useCompleteWorkOrderMutation,
  useConfirmWorkOrderMutation,
  useCloseWorkOrderMutation,
  useDeleteWorkOrderMutation,
  workOrderCreateSchema,
  workOrderAssignSchema,
  workOrderScheduleSchema,
  workOrderChecklistSchema,
  workOrderNoteSchema,
  workOrderPhotoSchema,
  workOrderCompleteSchema,
  workOrderConfirmSchema,
  workOrderCloseSchema
} from '../../features/services/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';
import { useCustomersQuery } from '../../features/customers/index.js';
import {
  Badge,
  Button,
  Card,
  Modal,
  Drawer,
  EmptyState,
  ErrorState,
  SkeletonTable,
  ConfirmDialog
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const WorkOrdersPage = () => {
  const { isOwner, isAdmin, isManager } = useAuth();
  const canManage = isOwner || isAdmin || isManager;

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');

  // Selection & Modal State
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'checklists' | 'notes' | 'photos' | 'signoff'
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [woToDelete, setWoToDelete] = useState(null);

  // Queries
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      assigned_to: techFilter !== 'all' ? techFilter : undefined
    }),
    [debouncedSearch, statusFilter, priorityFilter, techFilter]
  );

  const {
    data: workOrders = [],
    isLoading,
    isError,
    error,
    refetch
  } = useWorkOrdersQuery(queryFilters);

  const { data: activeWorkOrder, isLoading: isDetailLoading } =
    useWorkOrderDetailQuery(selectedWorkOrderId);

  const { data: employees = [] } = useEmployeesQuery();
  const { data: customers = [] } = useCustomersQuery();

  // Mutations
  const createMutation = useCreateWorkOrderMutation();
  const assignMutation = useAssignTechnicianMutation();
  const scheduleMutation = useScheduleWorkOrderMutation();
  const statusMutation = useChangeWorkOrderStatusMutation();
  const addChecklistMutation = useAddChecklistMutation();
  const toggleChecklistMutation = useToggleChecklistMutation();
  const deleteChecklistMutation = useDeleteChecklistMutation();
  const addNoteMutation = useAddJobNoteMutation();
  const addPhotoMutation = useAddPhotoMutation();
  const completeMutation = useCompleteWorkOrderMutation();
  const confirmMutation = useConfirmWorkOrderMutation();
  const closeMutation = useCloseWorkOrderMutation();
  const deleteMutation = useDeleteWorkOrderMutation();

  // Create Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating }
  } = useForm({
    resolver: zodResolver(workOrderCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      site: '',
      priority: 'normal',
      assigned_to: '',
      cost_estimate: 0
    }
  });

  // Assign Form
  const {
    register: registerAssign,
    handleSubmit: handleAssignSubmit,
    reset: resetAssign,
    formState: { errors: assignErrors, isSubmitting: isAssigning }
  } = useForm({
    resolver: zodResolver(workOrderAssignSchema),
    defaultValues: { assigned_to: '', scheduled_window: '' }
  });

  // Schedule Form
  const {
    register: registerSchedule,
    handleSubmit: handleScheduleSubmit,
    reset: resetSchedule,
    formState: { errors: scheduleErrors, isSubmitting: isScheduling }
  } = useForm({
    resolver: zodResolver(workOrderScheduleSchema),
    defaultValues: {
      scheduled_start: '',
      scheduled_end: '',
      scheduled_window: ''
    }
  });

  // Checklist Item Form
  const {
    register: registerChecklist,
    handleSubmit: handleChecklistSubmit,
    reset: resetChecklist,
    formState: { errors: checklistErrors, isSubmitting: isAddingChecklist }
  } = useForm({
    resolver: zodResolver(workOrderChecklistSchema),
    defaultValues: { item_text: '' }
  });

  // Job Note Form
  const {
    register: registerNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNote,
    formState: { errors: noteErrors, isSubmitting: isAddingNote }
  } = useForm({
    resolver: zodResolver(workOrderNoteSchema),
    defaultValues: { note: '', is_internal: false }
  });

  // Photo Form
  const {
    register: registerPhoto,
    handleSubmit: handlePhotoSubmit,
    reset: resetPhoto,
    formState: { errors: photoErrors, isSubmitting: isUploadingPhoto }
  } = useForm({
    resolver: zodResolver(workOrderPhotoSchema),
    defaultValues: { type: 'before', url: '', caption: '' }
  });

  // Complete Form
  const {
    register: registerComplete,
    handleSubmit: handleCompleteSubmit,
    reset: resetComplete,
    formState: { errors: completeErrors, isSubmitting: isCompleting }
  } = useForm({
    resolver: zodResolver(workOrderCompleteSchema),
    defaultValues: { completion_notes: '', actual_cost: 0, labor_hours: 1 }
  });

  // Confirm Form
  const {
    register: registerConfirm,
    handleSubmit: handleConfirmSubmit,
    reset: resetConfirm,
    formState: { errors: confirmErrors, isSubmitting: isConfirming }
  } = useForm({
    resolver: zodResolver(workOrderConfirmSchema),
    defaultValues: {
      customer_signature_url: 'data:image/svg+xml;utf8,<svg>Verified Signature</svg>',
      rating: 5,
      feedback: ''
    }
  });

  // Close Form
  const {
    register: registerClose,
    handleSubmit: handleCloseSubmit,
    reset: resetClose,
    formState: { errors: closeErrors, isSubmitting: isClosing }
  } = useForm({
    resolver: zodResolver(workOrderCloseSchema),
    defaultValues: { closing_notes: '' }
  });

  // KPI Computations
  const stats = useMemo(() => {
    const list = Array.isArray(workOrders) ? workOrders : [];
    return {
      total: list.length,
      inProgress: list.filter((w) => w.status === 'in_progress').length,
      scheduled: list.filter((w) => w.status === 'scheduled' || w.status === 'dispatched').length,
      completed: list.filter((w) => w.status === 'completed').length,
      closed: list.filter((w) => w.status === 'closed').length
    };
  }, [workOrders]);

  // Submit Handlers
  const onSubmitCreate = async (data) => {
    const payload = {
      ...data,
      assigned_to: data.assigned_to || null,
      checklists: [
        'Perform safety inspection and lockout-tagout',
        'Execute diagnostic and field service tasks',
        'Capture completion photos for compliance record'
      ]
    };
    await createMutation.mutateAsync(payload);
    resetCreate();
    setCreateModalOpen(false);
  };

  const onSubmitAssign = async (data) => {
    if (!selectedWorkOrderId) return;
    await assignMutation.mutateAsync({
      id: selectedWorkOrderId,
      payload: data
    });
    resetAssign();
    setAssignModalOpen(false);
  };

  const onSubmitSchedule = async (data) => {
    if (!selectedWorkOrderId) return;
    await scheduleMutation.mutateAsync({
      id: selectedWorkOrderId,
      payload: data
    });
    resetSchedule();
    setScheduleModalOpen(false);
  };

  const onSubmitChecklist = async (data) => {
    if (!selectedWorkOrderId) return;
    await addChecklistMutation.mutateAsync({
      id: selectedWorkOrderId,
      item_text: data.item_text
    });
    resetChecklist();
  };

  const handleToggleChecklist = async (itemId, currentCompleted) => {
    if (!selectedWorkOrderId) return;
    await toggleChecklistMutation.mutateAsync({
      id: selectedWorkOrderId,
      itemId,
      is_completed: !currentCompleted
    });
  };

  const handleDeleteChecklist = async (itemId) => {
    if (!selectedWorkOrderId) return;
    await deleteChecklistMutation.mutateAsync({
      id: selectedWorkOrderId,
      itemId
    });
  };

  const onSubmitNote = async (data) => {
    if (!selectedWorkOrderId) return;
    await addNoteMutation.mutateAsync({
      id: selectedWorkOrderId,
      note: data.note,
      is_internal: data.is_internal
    });
    resetNote();
  };

  const onSubmitPhoto = async (data) => {
    if (!selectedWorkOrderId) return;
    await addPhotoMutation.mutateAsync({
      id: selectedWorkOrderId,
      type: data.type,
      url: data.url,
      caption: data.caption
    });
    resetPhoto();
  };

  const onSubmitComplete = async (data) => {
    if (!selectedWorkOrderId) return;
    await completeMutation.mutateAsync({
      id: selectedWorkOrderId,
      payload: data
    });
    resetComplete();
    setCompleteModalOpen(false);
  };

  const onSubmitConfirm = async (data) => {
    if (!selectedWorkOrderId) return;
    await confirmMutation.mutateAsync({
      id: selectedWorkOrderId,
      payload: data
    });
    resetConfirm();
    setConfirmModalOpen(false);
  };

  const onSubmitClose = async (data) => {
    if (!selectedWorkOrderId) return;
    await closeMutation.mutateAsync({
      id: selectedWorkOrderId,
      closing_notes: data.closing_notes
    });
    resetClose();
    setCloseModalOpen(false);
  };

  const handleStatusChange = async (targetStatus, reason = '') => {
    if (!selectedWorkOrderId) return;
    await statusMutation.mutateAsync({
      id: selectedWorkOrderId,
      status: targetStatus,
      reason
    });
  };

  const handleDeleteWorkOrder = async () => {
    if (!woToDelete) return;
    await deleteMutation.mutateAsync(woToDelete.id);
    setWoToDelete(null);
    setDeleteConfirmOpen(false);
    if (selectedWorkOrderId === woToDelete.id) {
      setSelectedWorkOrderId(null);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return (
          <Badge variant="danger" size="sm">
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="warning" size="sm">
            High Priority
          </Badge>
        );
      case 'normal':
        return (
          <Badge variant="primary" size="sm">
            Normal
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            Low
          </Badge>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return (
          <Badge variant="primary" size="sm">
            In Progress
          </Badge>
        );
      case 'dispatched':
        return (
          <Badge variant="warning" size="sm">
            Dispatched
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="secondary" size="sm">
            Scheduled
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" size="sm">
            Completed
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="neutral" size="sm">
            Closed
          </Badge>
        );
      case 'review':
        return (
          <Badge variant="warning" size="sm">
            In Review
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge variant="neutral" size="sm">
            Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Work Orders & Field Operations
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track technician dispatch, compliance checklists, before/after evidence photos, and
            customer signoffs.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card variant="default" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total WOs
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</div>
          </div>
        </Card>

        <Card variant="default" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Scheduled / Dispatch
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {stats.scheduled}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              In Progress
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {stats.inProgress}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Completed
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {stats.completed}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Closed Out
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{stats.closed}</div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card variant="default" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, code or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="dispatched">Dispatched</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Assigned Technicians</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Table */}
      <Card variant="default" className="overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              title="Failed to Load Work Orders"
              message={error?.apiMessage || error?.message || 'Could not retrieve work orders.'}
              onRetry={refetch}
            />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Wrench}
              title="No Work Orders Found"
              description="No active work orders match your search parameters. Create a work order to deploy field personnel."
              actionLabel="Create Work Order"
              onAction={() => setCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">WO Code</th>
                  <th className="py-3 px-4 font-bold">Job Title & Site</th>
                  <th className="py-3 px-4 font-bold">Client Account</th>
                  <th className="py-3 px-4 font-bold">Technician</th>
                  <th className="py-3 px-4 font-bold">Priority / Status</th>
                  <th className="py-3 px-4 font-bold">Checklist Progress</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {wo.work_order_code || wo.id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {wo.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{wo.site || 'Site Location'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {wo.customer_name || 'Client Account'}
                      </div>
                      {wo.service_request_id && (
                        <div className="text-[10px] text-slate-400">
                          Ref: {wo.service_request_id}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                          {(wo.assigned_technician || 'U')[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {wo.assigned_technician || 'Unassigned'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {wo.scheduled_window || 'No window set'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getPriorityBadge(wo.priority)}
                        {getStatusBadge(wo.status)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Progress</span>
                          <span className="font-bold">{wo.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              wo.progress === 100
                                ? 'bg-emerald-500'
                                : wo.progress >= 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                            }`}
                            style={{ width: `${wo.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setSelectedWorkOrderId(wo.id);
                            setDrawerTab('overview');
                          }}
                          title="Open Work Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setWoToDelete(wo);
                              setDeleteConfirmOpen(true);
                            }}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            title="Archive Work Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Multi-Tab Slide-out Work Order Drawer */}
      <Drawer
        isOpen={Boolean(selectedWorkOrderId)}
        onClose={() => setSelectedWorkOrderId(null)}
        title={activeWorkOrder?.work_order_code || 'Work Order Management'}
        size="lg"
      >
        {isDetailLoading || !activeWorkOrder ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Loading work order details...
          </div>
        ) : (
          <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300">
            {/* Header Badge Row */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                <div className="mt-1">{getStatusBadge(activeWorkOrder.status)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Priority</div>
                <div className="mt-1">{getPriorityBadge(activeWorkOrder.priority)}</div>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto pb-1">
              {[
                { id: 'overview', label: 'Overview & Schedule' },
                {
                  id: 'checklists',
                  label: `Checklists (${(activeWorkOrder.checklists || []).length})`
                },
                { id: 'notes', label: `Job Notes (${(activeWorkOrder.notes || []).length})` },
                {
                  id: 'photos',
                  label: `Photos (${(activeWorkOrder.before_photos || []).length + (activeWorkOrder.after_photos || []).length})`
                },
                { id: 'signoff', label: 'Completion & Signoff' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-colors whitespace-nowrap text-xs ${
                    drawerTab === t.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & SCHEDULE */}
            {drawerTab === 'overview' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeWorkOrder.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    {activeWorkOrder.description || 'No job description provided.'}
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="font-bold text-slate-600 dark:text-slate-300">Client: </span>
                      {activeWorkOrder.customer_name || 'Standard Account'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-600 dark:text-slate-300">Site: </span>
                      {activeWorkOrder.site || 'Site Not Specified'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        Assigned Tech:{' '}
                      </span>
                      {activeWorkOrder.assigned_technician || 'None'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        Scheduled:{' '}
                      </span>
                      {activeWorkOrder.scheduled_window || 'Not scheduled'}
                    </div>
                  </div>
                </div>

                {/* Status Transitions Control Bar */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Workflow State Actions
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeWorkOrder.status === 'draft' && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setAssignModalOpen(true)}
                      >
                        <User className="w-3.5 h-3.5 mr-1" />
                        <span>Assign Technician</span>
                      </Button>
                    )}

                    {(activeWorkOrder.status === 'draft' ||
                      activeWorkOrder.status === 'scheduled') && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setScheduleModalOpen(true)}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        <span>Schedule Window</span>
                      </Button>
                    )}

                    {activeWorkOrder.status === 'dispatched' && (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() =>
                          handleStatusChange(
                            'in_progress',
                            'Technician arrived and began execution'
                          )
                        }
                      >
                        <Activity className="w-3.5 h-3.5 mr-1" />
                        <span>Start Work (In Progress)</span>
                      </Button>
                    )}

                    {activeWorkOrder.status === 'in_progress' && (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => setCompleteModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Record Completion</span>
                      </Button>
                    )}

                    {activeWorkOrder.status === 'completed' &&
                      !activeWorkOrder.customer_confirmation && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setConfirmModalOpen(true)}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          <span>Record Customer Signoff</span>
                        </Button>
                      )}

                    {activeWorkOrder.status === 'completed' && canManage && (
                      <Button variant="primary" size="xs" onClick={() => setCloseModalOpen(true)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Official Work Order Closure</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Execution Progress
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {activeWorkOrder.progress || 0}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeWorkOrder.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INTERACTIVE CHECKLISTS */}
            {drawerTab === 'checklists' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {!activeWorkOrder.checklists || activeWorkOrder.checklists.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                      No checklist tasks assigned to this work order.
                    </div>
                  ) : (
                    activeWorkOrder.checklists.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg border transition-colors flex items-center justify-between ${
                          c.is_completed
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(c.id, c.is_completed)}
                          className="flex items-center gap-2.5 text-left flex-1"
                        >
                          {c.is_completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={
                              c.is_completed ? 'line-through text-slate-400' : 'font-medium'
                            }
                          >
                            {c.item_text}
                          </span>
                        </button>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDeleteChecklist(c.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Checklist Item Form */}
                <form onSubmit={handleChecklistSubmit(onSubmitChecklist)} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add step (e.g. Inspect hydraulic lines for leaks)..."
                    {...registerChecklist('item_text')}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button variant="secondary" size="sm" type="submit" isLoading={isAddingChecklist}>
                    Add Item
                  </Button>
                </form>
                {checklistErrors.item_text && (
                  <p className="text-[11px] text-rose-500">{checklistErrors.item_text.message}</p>
                )}
              </div>
            )}

            {/* TAB 3: JOB NOTES & FIELD LOGS */}
            {drawerTab === 'notes' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {!activeWorkOrder.notes || activeWorkOrder.notes.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                      No job notes recorded for this work order yet.
                    </div>
                  ) : (
                    activeWorkOrder.notes.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-lg border ${
                          n.is_internal
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {n.author_name}
                          </span>
                          <span className="text-slate-400">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{n.note}</p>
                        {n.is_internal && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            [Staff Internal Only]
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleNoteSubmit(onSubmitNote)} className="space-y-2">
                  <FormTextarea
                    name="note"
                    placeholder="Enter technician field notes, diagnostic measurements, or obstacles..."
                    rows={2}
                    register={registerNote}
                    errors={noteErrors}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        {...registerNote('is_internal')}
                        className="rounded text-indigo-600"
                      />
                      <span>Mark as internal staff-only note</span>
                    </label>
                    <Button variant="primary" size="sm" type="submit" isLoading={isAddingNote}>
                      Post Job Note
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: BEFORE & AFTER PHOTOS */}
            {drawerTab === 'photos' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Before Photos */}
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Before Work ({(activeWorkOrder.before_photos || []).length})
                    </h4>
                    <div className="space-y-2">
                      {!activeWorkOrder.before_photos ||
                      activeWorkOrder.before_photos.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                          No initial photos.
                        </div>
                      ) : (
                        activeWorkOrder.before_photos.map((p, i) => (
                          <div
                            key={i}
                            className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                          >
                            <img
                              src={p.url}
                              alt={p.caption || 'Before'}
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800">
                              {p.caption || 'Initial condition'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* After Photos */}
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      After Completion ({(activeWorkOrder.after_photos || []).length})
                    </h4>
                    <div className="space-y-2">
                      {!activeWorkOrder.after_photos ||
                      activeWorkOrder.after_photos.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                          No completion photos.
                        </div>
                      ) : (
                        activeWorkOrder.after_photos.map((p, i) => (
                          <div
                            key={i}
                            className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                          >
                            <img
                              src={p.url}
                              alt={p.caption || 'After'}
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800">
                              {p.caption || 'Completed work'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Photo Form */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-500" />
                    <span>Upload Job Photograph</span>
                  </h4>
                  <form onSubmit={handlePhotoSubmit(onSubmitPhoto)} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        {...registerPhoto('type')}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="before">Before Work Photo</option>
                        <option value="after">After Completion Photo</option>
                      </select>

                      <div>
                        <input
                          type="text"
                          placeholder="Image URL..."
                          {...registerPhoto('url')}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        {photoErrors.url && (
                          <p className="text-red-500 text-[11px] mt-0.5">
                            {photoErrors.url.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Caption or description (e.g. Broken valve before removal)..."
                        {...registerPhoto('caption')}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      {photoErrors.caption && (
                        <p className="text-red-500 text-[11px] mt-0.5">
                          {photoErrors.caption.message}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="submit"
                        isLoading={isUploadingPhoto}
                      >
                        Save Photo
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 5: COMPLETION & SIGNOFF */}
            {drawerTab === 'signoff' && (
              <div className="space-y-4">
                {activeWorkOrder.completion_details ? (
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Completion Certified</span>
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-200">
                      {activeWorkOrder.completion_details.completion_notes}
                    </p>
                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/40 grid grid-cols-2 gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                      <div>Actual Cost: ${Number(activeWorkOrder.actual_cost || 0).toFixed(2)}</div>
                      <div>Labor Hours: {activeWorkOrder.labor_hours || 0} hrs</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                    Completion details have not yet been recorded for this work order.
                  </div>
                )}

                {activeWorkOrder.customer_confirmation ? (
                  <div className="p-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Customer Signature & Confirmation</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (activeWorkOrder.customer_confirmation.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 italic">
                      "
                      {activeWorkOrder.customer_confirmation.feedback ||
                        'Work completed to satisfaction.'}
                      "
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Signed by:{' '}
                      {activeWorkOrder.customer_confirmation.confirmed_by ||
                        'Client Representative'}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                    Awaiting customer review and digital signoff.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Work Order"
        size="md"
      >
        <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4 text-xs">
          <FormInput
            label="Work Order Title"
            name="title"
            placeholder="e.g. Loading Ramp Hydraulic Maintenance"
            register={registerCreate}
            errors={createErrors}
            required
          />

          <FormSelect
            label="Customer Account (Optional)"
            name="customer_id"
            register={registerCreate}
            errors={createErrors}
            options={[
              { value: '', label: 'Select Customer Account...' },
              ...customers.map((c) => ({
                value: c.id,
                label: c.company_name || c.name
              }))
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Job Priority"
              name="priority"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: 'critical', label: 'Critical Outage' },
                { value: 'high', label: 'High Priority' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' }
              ]}
            />

            <FormSelect
              label="Assign Technician (Optional)"
              name="assigned_to"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: '', label: 'Unassigned (Dispatch Later)' },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.first_name} ${e.last_name}`
                }))
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Site / Facility Location"
              name="site"
              placeholder="e.g. Dock 4 Bay B"
              register={registerCreate}
              errors={createErrors}
            />

            <FormInput
              label="Cost Estimate ($)"
              name="cost_estimate"
              type="number"
              register={registerCreate}
              errors={createErrors}
            />
          </div>

          <FormTextarea
            label="Job Description & Instructions"
            name="description"
            rows={3}
            register={registerCreate}
            errors={createErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreating}>
              Create Work Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Technician"
        size="sm"
      >
        <form onSubmit={handleAssignSubmit(onSubmitAssign)} className="space-y-4 text-xs">
          <FormSelect
            label="Select Technician"
            name="assigned_to"
            register={registerAssign}
            errors={assignErrors}
            options={[
              { value: '', label: 'Select Technician...' },
              ...employees.map((e) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name} (${e.designation || 'Technician'})`
              }))
            ]}
          />

          <FormInput
            label="Scheduled Window (Optional)"
            name="scheduled_window"
            placeholder="e.g. Today 13:00 - 17:00"
            register={registerAssign}
            errors={assignErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isAssigning}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Work Order"
        size="sm"
      >
        <form onSubmit={handleScheduleSubmit(onSubmitSchedule)} className="space-y-4 text-xs">
          <FormInput
            label="Scheduled Start Date/Time"
            name="scheduled_start"
            type="datetime-local"
            register={registerSchedule}
            errors={scheduleErrors}
            required
          />

          <FormInput
            label="Scheduled End Date/Time"
            name="scheduled_end"
            type="datetime-local"
            register={registerSchedule}
            errors={scheduleErrors}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isScheduling}>
              Save Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Record Work Order Completion"
        size="md"
      >
        <form onSubmit={handleCompleteSubmit(onSubmitComplete)} className="space-y-4 text-xs">
          <FormTextarea
            label="Completion Notes & Findings"
            name="completion_notes"
            placeholder="Summarize actions executed, components replaced, and post-testing results..."
            rows={3}
            register={registerComplete}
            errors={completeErrors}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Actual Total Cost ($)"
              name="actual_cost"
              type="number"
              register={registerComplete}
              errors={completeErrors}
            />

            <FormInput
              label="Actual Labor Hours"
              name="labor_hours"
              type="number"
              step="0.5"
              register={registerComplete}
              errors={completeErrors}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCompleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isCompleting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Certify Completion
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Record Customer Signoff"
        size="sm"
      >
        <form onSubmit={handleConfirmSubmit(onSubmitConfirm)} className="space-y-4 text-xs">
          <FormSelect
            label="Satisfaction Rating"
            name="rating"
            register={registerConfirm}
            errors={confirmErrors}
            options={[
              { value: '5', label: '5 Stars - Exceptional Service' },
              { value: '4', label: '4 Stars - Good Work' },
              { value: '3', label: '3 Stars - Satisfactory' },
              { value: '2', label: '2 Stars - Needs Improvement' },
              { value: '1', label: '1 Star - Unsatisfactory' }
            ]}
          />

          <FormTextarea
            label="Customer Feedback"
            name="feedback"
            placeholder="Optional client comments..."
            rows={2}
            register={registerConfirm}
            errors={confirmErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isConfirming}>
              Save Customer Signoff
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Official Work Order Closure"
        size="sm"
      >
        <form onSubmit={handleCloseSubmit(onSubmitClose)} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Closing this work order marks all billing items finalized and automatically archives any
            linked client service request.
          </p>

          <FormTextarea
            label="Manager Closing Notes (Optional)"
            name="closing_notes"
            placeholder="e.g. Audit complete, work verified, invoice approved."
            rows={2}
            register={registerClose}
            errors={closeErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCloseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isClosing}>
              Confirm Closure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive / Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteWorkOrder}
        title="Archive Work Order?"
        message={`Are you sure you want to archive work order ${woToDelete?.work_order_code}? This action will remove it from active dispatch lists.`}
        confirmText="Archive Work Order"
        variant="danger"
      />
    </div>
  );
};

export default WorkOrdersPage;
