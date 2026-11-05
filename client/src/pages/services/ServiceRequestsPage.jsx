import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Inbox,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Paperclip,
  TrendingUp,
  FileText,
  DollarSign,
  History
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useServiceRequestsQuery,
  useServiceRequestDetailQuery,
  useCreateServiceRequestMutation,
  useReviewServiceRequestMutation,
  useApproveServiceRequestMutation,
  useRejectServiceRequestMutation,
  useConvertServiceRequestMutation,
  serviceRequestCreateSchema,
  serviceRequestApproveSchema,
  serviceRequestRejectSchema,
  serviceRequestConvertSchema
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
  SkeletonTable
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const ServiceRequestsPage = () => {
  const { isOwner, isAdmin, isManager } = useAuth();
  const canManage = isOwner || isAdmin || isManager;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Drawer & Modal Selection State
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [approveModalRequest, setApproveModalRequest] = useState(null);
  const [rejectModalRequest, setRejectModalRequest] = useState(null);
  const [convertModalRequest, setConvertModalRequest] = useState(null);

  // Queries
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined,
      service_type: categoryFilter !== 'all' ? categoryFilter : undefined
    }),
    [debouncedSearch, statusFilter, urgencyFilter, categoryFilter]
  );

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch
  } = useServiceRequestsQuery(queryFilters);

  const { data: activeRequest, isLoading: isDetailLoading } =
    useServiceRequestDetailQuery(selectedRequestId);

  const { data: employees = [] } = useEmployeesQuery();
  const { data: customers = [] } = useCustomersQuery();

  // Mutations
  const createMutation = useCreateServiceRequestMutation();
  const reviewMutation = useReviewServiceRequestMutation();
  const approveMutation = useApproveServiceRequestMutation();
  const rejectMutation = useRejectServiceRequestMutation();
  const convertMutation = useConvertServiceRequestMutation();

  // Create Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating }
  } = useForm({
    resolver: zodResolver(serviceRequestCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      service_type: 'repair',
      urgency: 'normal',
      estimated_cost: 0,
      customer_id: ''
    }
  });

  // Approve Form
  const {
    register: registerApprove,
    handleSubmit: handleApproveSubmit,
    reset: resetApprove,
    formState: { errors: approveErrors, isSubmitting: isApproving }
  } = useForm({
    resolver: zodResolver(serviceRequestApproveSchema),
    defaultValues: { manager_notes: '' }
  });

  // Reject Form
  const {
    register: registerReject,
    handleSubmit: handleRejectSubmit,
    reset: resetReject,
    formState: { errors: rejectErrors, isSubmitting: isRejecting }
  } = useForm({
    resolver: zodResolver(serviceRequestRejectSchema),
    defaultValues: { rejection_reason: '' }
  });

  // Convert Form
  const {
    register: registerConvert,
    handleSubmit: handleConvertSubmit,
    reset: resetConvert,
    formState: { errors: convertErrors, isSubmitting: isConverting }
  } = useForm({
    resolver: zodResolver(serviceRequestConvertSchema),
    defaultValues: {
      title: '',
      assigned_to: '',
      priority: 'high',
      site: '',
      cost_estimate: 0
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    return {
      total: list.length,
      inReview: list.filter((r) => r.status === 'in_review').length,
      approved: list.filter((r) => r.status === 'approved').length,
      converted: list.filter((r) => r.status === 'converted').length,
      critical: list.filter((r) => r.urgency === 'critical').length
    };
  }, [requests]);

  const onSubmitCreate = async (data) => {
    const payload = {
      ...data,
      customer_id: data.customer_id || undefined
    };
    await createMutation.mutateAsync(payload);
    resetCreate();
    setCreateModalOpen(false);
  };

  const onSubmitApprove = async (data) => {
    if (!approveModalRequest) return;
    await approveMutation.mutateAsync({
      id: approveModalRequest.id,
      manager_notes: data.manager_notes
    });
    resetApprove();
    setApproveModalRequest(null);
  };

  const onSubmitReject = async (data) => {
    if (!rejectModalRequest) return;
    await rejectMutation.mutateAsync({
      id: rejectModalRequest.id,
      rejection_reason: data.rejection_reason
    });
    resetReject();
    setRejectModalRequest(null);
  };

  const onOpenConvertModal = (request) => {
    setConvertModalRequest(request);
    resetConvert({
      title: request.title,
      site: request.location || '',
      priority: request.urgency === 'critical' ? 'critical' : 'high',
      cost_estimate: request.estimated_cost || 0,
      assigned_to: employees[0]?.id || ''
    });
  };

  const onSubmitConvert = async (data) => {
    if (!convertModalRequest) return;
    await convertMutation.mutateAsync({
      id: convertModalRequest.id,
      payload: data
    });
    resetConvert();
    setConvertModalRequest(null);
  };

  const handleReviewClick = async (request) => {
    await reviewMutation.mutateAsync({
      id: request.id,
      manager_notes: 'Manager opened review for scoping'
    });
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'critical':
        return (
          <Badge variant="danger" size="sm">
            Critical (2h)
          </Badge>
        );
      case 'urgent':
        return (
          <Badge variant="danger" size="sm">
            Urgent (4h)
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
            Standard SLA
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
      case 'approved':
        return (
          <Badge variant="success" size="sm">
            Approved
          </Badge>
        );
      case 'in_review':
        return (
          <Badge variant="warning" size="sm">
            In Review
          </Badge>
        );
      case 'converted':
        return (
          <Badge variant="primary" size="sm">
            Converted to WO
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm">
            Rejected
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="neutral" size="sm">
            Closed
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            New
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
            <Inbox className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Service Requests & Intake Triage
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review inbound client tickets, verify scope and SLAs, and dispatch approved work orders
            into the field.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Service Request</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Requests
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</div>
          </div>
        </Card>

        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              In Review
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {stats.inReview}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Approved for Dispatch
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {stats.approved}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Converted to WO
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {stats.converted}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card variant="default" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, code or location..."
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
            <option value="new">New (Awaiting Review)</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="converted">Converted to Work Order</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Urgency Levels</option>
            <option value="critical">Critical (Immediate)</option>
            <option value="urgent">Urgent Priority</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="repair">Equipment Repair</option>
            <option value="maintenance">Preventative Maintenance</option>
            <option value="safety">Safety Audit</option>
            <option value="installation">Installation</option>
            <option value="inspection">Diagnostic Inspection</option>
            <option value="emergency">Emergency Outage</option>
          </select>
        </div>
      </Card>

      {/* Main Table Content */}
      <Card variant="default" className="overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              title="Failed to Load Service Requests"
              message={
                error?.apiMessage || error?.message || 'Could not connect to service repository.'
              }
              onRetry={refetch}
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Inbox}
              title="No Service Requests Found"
              description="No tickets match the current search filters. Submit a request to begin operations triage."
              actionLabel="Log Service Request"
              onAction={() => setCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Request Code</th>
                  <th className="py-3 px-4 font-bold">Client / Customer</th>
                  <th className="py-3 px-4 font-bold">Issue & Scope</th>
                  <th className="py-3 px-4 font-bold">Urgency / Category</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {r.request_code || r.id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {r.customer_name || 'Client Account'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{r.location || 'Facility Location'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {r.description || 'No detailed scope notes provided'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getUrgencyBadge(r.urgency)}
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {r.service_type || 'Repair'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSelectedRequestId(r.id)}
                          title="View Details & History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Review Action */}
                        {canManage && r.status === 'new' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleReviewClick(r)}
                            title="Commence Review"
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            <span>Review</span>
                          </Button>
                        )}

                        {/* Approve Action */}
                        {canManage && (r.status === 'new' || r.status === 'in_review') && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setApproveModalRequest(r)}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            title="Approve for Dispatch"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Approve</span>
                          </Button>
                        )}

                        {/* Reject Action */}
                        {canManage && (r.status === 'new' || r.status === 'in_review') && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setRejectModalRequest(r)}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            title="Reject Request"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Reject</span>
                          </Button>
                        )}

                        {/* Convert to Work Order */}
                        {canManage && r.status === 'approved' && !r.converted_work_order_id && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => onOpenConvertModal(r)}
                            title="Generate Work Order"
                          >
                            <ArrowRight className="w-3.5 h-3.5 mr-1" />
                            <span>Dispatch WO</span>
                          </Button>
                        )}

                        {/* Linked WO Badge */}
                        {r.converted_work_order_id && (
                          <Badge variant="primary" size="sm">
                            Linked WO
                          </Badge>
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

      {/* Slide-out Request Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        title={activeRequest?.request_code || 'Service Request Details'}
        size="lg"
      >
        {isDetailLoading || !activeRequest ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading details...</div>
        ) : (
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300">
            {/* Status & Urgency Header */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Current Status</div>
                <div className="mt-1">{getStatusBadge(activeRequest.status)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">SLA Priority</div>
                <div className="mt-1">{getUrgencyBadge(activeRequest.urgency)}</div>
              </div>
            </div>

            {/* Scope Details */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Scope & Reported Issue
              </h3>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {activeRequest.title}
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {activeRequest.description || 'No additional scope notes provided.'}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{activeRequest.location || 'Location Not Specified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Estimate: ${Number(activeRequest.estimated_cost || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manager Notes / Rejection Reason */}
            {activeRequest.manager_notes && (
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                <div className="font-bold mb-1">Manager Review / Approval Notes</div>
                <p>{activeRequest.manager_notes}</p>
              </div>
            )}

            {activeRequest.rejection_reason && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300">
                <div className="font-bold mb-1">Rejection Reason</div>
                <p>{activeRequest.rejection_reason}</p>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-500" />
                <span>Attachments ({(activeRequest.attachments || []).length})</span>
              </h3>
              {!activeRequest.attachments || activeRequest.attachments.length === 0 ? (
                <div className="p-3 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-center">
                  No attachments uploaded for this ticket.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRequest.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {att.name}
                        </span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold"
                      >
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status History Timeline */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Audit & Status History</span>
              </h3>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {(activeRequest.status_history || []).map((h, i) => (
                  <div key={i} className="relative pl-7 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 absolute left-2 top-1.5" />
                    <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px]">
                      {h.status}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(h.timestamp).toLocaleString()} • {h.changed_by_name || 'System'}
                    </div>
                    {h.notes && (
                      <div className="mt-1 text-slate-600 dark:text-slate-300 italic">
                        "{h.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Submit New Service Request"
        size="md"
      >
        <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4 text-xs">
          <FormInput
            label="Service Title / Reported Problem"
            name="title"
            placeholder="e.g. Loading Bay 4 Conveyor Grinding Noise"
            register={registerCreate}
            errors={createErrors}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Service Category"
              name="service_type"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: 'repair', label: 'Equipment Repair' },
                { value: 'maintenance', label: 'Preventative Servicing' },
                { value: 'safety', label: 'Safety & Compliance' },
                { value: 'installation', label: 'Hardware Installation' },
                { value: 'inspection', label: 'Diagnostic Inspection' },
                { value: 'emergency', label: 'Emergency Outage' }
              ]}
            />

            <FormSelect
              label="SLA Urgency"
              name="urgency"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: 'low', label: 'Low Priority' },
                { value: 'normal', label: 'Normal (Standard 24h)' },
                { value: 'high', label: 'High Priority (8h)' },
                { value: 'urgent', label: 'Urgent Priority (4h)' },
                { value: 'critical', label: 'Critical Outage (Immediate)' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Client Account"
              name="customer_id"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: '', label: 'Select Client Account...' },
                ...customers.map((c) => ({ value: c.id, label: c.name }))
              ]}
            />

            <FormInput
              label="Facility / Bay Location"
              name="location"
              placeholder="e.g. Bay 4 South"
              register={registerCreate}
              errors={createErrors}
            />
          </div>

          <FormTextarea
            label="Detailed Scope Notes"
            name="description"
            placeholder="Describe symptoms, operational impact, and equipment tags..."
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
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={Boolean(approveModalRequest)}
        onClose={() => setApproveModalRequest(null)}
        title={`Approve Request: ${approveModalRequest?.request_code}`}
        size="sm"
      >
        <form onSubmit={handleApproveSubmit(onSubmitApprove)} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Approving this request authorizes field technician scheduling and work order generation.
          </p>

          <FormTextarea
            label="Manager Approval Notes (Optional)"
            name="manager_notes"
            placeholder="e.g. Sourced replacement bearing from central inventory. Approved for immediate dispatch."
            rows={3}
            register={registerApprove}
            errors={approveErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setApproveModalRequest(null)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isApproving}>
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectModalRequest)}
        onClose={() => setRejectModalRequest(null)}
        title={`Reject Request: ${rejectModalRequest?.request_code}`}
        size="sm"
      >
        <form onSubmit={handleRejectSubmit(onSubmitReject)} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Please state the justification for rejecting this request. This reason will be logged
            and communicated to the client.
          </p>

          <FormTextarea
            label="Rejection Reason"
            name="rejection_reason"
            placeholder="e.g. Out of warranty scope, client equipment decommissioned..."
            rows={3}
            register={registerReject}
            errors={rejectErrors}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setRejectModalRequest(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isRejecting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Convert to Work Order Modal */}
      <Modal
        isOpen={Boolean(convertModalRequest)}
        onClose={() => setConvertModalRequest(null)}
        title={`Dispatch Work Order for ${convertModalRequest?.request_code}`}
        size="md"
      >
        <form onSubmit={handleConvertSubmit(onSubmitConvert)} className="space-y-4 text-xs">
          <FormInput
            label="Work Order Title"
            name="title"
            register={registerConvert}
            errors={convertErrors}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Assign Lead Technician"
              name="assigned_to"
              register={registerConvert}
              errors={convertErrors}
              options={[
                { value: '', label: 'Select Technician...' },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.first_name} ${e.last_name} (${e.designation || 'Technician'})`
                }))
              ]}
            />

            <FormSelect
              label="Work Order Priority"
              name="priority"
              register={registerConvert}
              errors={convertErrors}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High Priority' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Facility / Site"
              name="site"
              register={registerConvert}
              errors={convertErrors}
            />

            <FormInput
              label="Estimated Cost ($)"
              name="cost_estimate"
              type="number"
              register={registerConvert}
              errors={convertErrors}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setConvertModalRequest(null)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isConverting}>
              Generate & Dispatch Work Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServiceRequestsPage;
