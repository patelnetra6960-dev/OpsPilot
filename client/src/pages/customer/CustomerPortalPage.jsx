import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  FileText,
  Plus,
  ShieldCheck,
  Send,
  Star,
  Clock,
  MapPin,
  Calendar,
  FolderGit2,
  DollarSign,
  User,
  Eye
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTenant } from '../../hooks/useTenant.js';
import {
  useCustomerPortalOverviewQuery,
  useCustomerServiceRequestsQuery,
  useCustomerServiceRequestDetailQuery,
  useCreateCustomerServiceRequestMutation,
  useSubmitCustomerFeedbackMutation,
  useCustomerProjectsQuery,
  useCustomerInvoicesQuery,
  useCustomerInvoiceDetailQuery,
  useCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
  serviceRequestCreateSchema,
  serviceRequestFeedbackSchema,
  customerProfileUpdateSchema
} from '../../features/customers/index.js';
import {
  Badge,
  Button,
  Modal,
  Drawer,
  EmptyState,
  ErrorState,
  Skeleton
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const CustomerPortalPage = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // Selected entities for modals / drawers
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Queries
  const { data: portalData } = useCustomerPortalOverviewQuery();
  const {
    data: serviceRequests = [],
    isLoading: isRequestsLoading,
    isError: isRequestsError,
    refetch: refetchRequests
  } = useCustomerServiceRequestsQuery();
  const { data: projects = [], isLoading: isProjectsLoading } = useCustomerProjectsQuery();
  const { data: invoices = [], isLoading: isInvoicesLoading } = useCustomerInvoicesQuery();
  const { data: activeProfile, refetch: refetchProfile } = useCustomerProfileQuery();

  // Detail Queries
  const { data: activeRequest, isLoading: isRequestDetailLoading } =
    useCustomerServiceRequestDetailQuery(selectedRequestId);
  const { data: activeInvoice, isLoading: isInvoiceDetailLoading } =
    useCustomerInvoiceDetailQuery(selectedInvoiceId);

  // Mutations
  const createRequestMutation = useCreateCustomerServiceRequestMutation();
  const submitFeedbackMutation = useSubmitCustomerFeedbackMutation();
  const updateProfileMutation = useUpdateCustomerProfileMutation();

  // Create Service Request Form
  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    reset: resetRequest,
    formState: { errors: requestErrors, isSubmitting: isCreatingRequest }
  } = useForm({
    resolver: zodResolver(serviceRequestCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      urgency: 'normal',
      service_type: 'repair'
    }
  });

  // Submit Feedback Form
  const {
    register: registerFeedback,
    handleSubmit: handleFeedbackSubmit,
    reset: resetFeedback,
    formState: { errors: feedbackErrors, isSubmitting: isSubmittingFeedback }
  } = useForm({
    resolver: zodResolver(serviceRequestFeedbackSchema),
    defaultValues: {
      rating: 5,
      comments: ''
    }
  });

  // Edit Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isUpdatingProfile }
  } = useForm({
    resolver: zodResolver(customerProfileUpdateSchema)
  });

  const handleOpenProfileModal = () => {
    resetProfile({
      name: activeProfile?.name || user?.full_name || '',
      phone: activeProfile?.phone || '',
      address:
        typeof activeProfile?.address === 'string'
          ? activeProfile.address
          : activeProfile?.address?.street
            ? `${activeProfile.address.street}, ${activeProfile.address.city || ''}`
            : ''
    });
    setProfileModalOpen(true);
  };

  const onSubmitRequest = async (data) => {
    await createRequestMutation.mutateAsync(data);
    resetRequest();
    setRequestModalOpen(false);
  };

  const onSubmitFeedback = async (data) => {
    if (!selectedRequestId) return;
    await submitFeedbackMutation.mutateAsync({
      requestId: selectedRequestId,
      rating: Number(data.rating),
      comments: data.comments
    });
    resetFeedback();
    setFeedbackModalOpen(false);
  };

  const onSubmitProfile = async (data) => {
    await updateProfileMutation.mutateAsync(data);
    refetchProfile();
    setProfileModalOpen(false);
  };

  const getUrgencyBadgeVariant = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'danger';
      case 'urgent':
      case 'high':
        return 'warning';
      case 'normal':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'closed':
      case 'completed':
      case 'paid':
        return 'success';
      case 'in_progress':
      case 'assigned':
        return 'brand';
      case 'in_review':
        return 'primary';
      case 'new':
      case 'pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const customerName =
    activeProfile?.company_name ||
    portalData?.customer?.name ||
    user?.full_name ||
    'Customer Account';
  const slaTier = activeProfile?.sla_tier || portalData?.customer?.sla_tier || 'Standard';

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase tracking-wider font-semibold">
                Customer Self-Service Portal
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-indigo-300 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{slaTier.toUpperCase()} SLA Active</span>
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{customerName}</h1>
            <p className="text-xs text-slate-300 max-w-xl">
              Track live operational service orders, permitted project milestone developments, and
              itemized invoice billing for {currentTenant?.name || 'OpsPilot'}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={handleOpenProfileModal}
            >
              <User className="w-4 h-4 mr-1.5" />
              <span>Account Profile</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              className="bg-indigo-600 hover:bg-indigo-500 shadow-md"
              onClick={() => setRequestModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Request Service</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Service Requests</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {serviceRequests.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total tickets filed</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active In Field</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {serviceRequests.filter((r) => r.status !== 'closed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned or in progress</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Linked Projects</span>
            <FolderGit2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {projects.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active facility deployments</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Billing Statements
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {invoices.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Invoices & receipts</div>
        </div>
      </div>

      {/* SECTION 1: Active Service Requests & Live Tracking */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Service Requests & Maintenance Tickets</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live status triage, dispatched technician ETA, and satisfaction verification.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRequestModalOpen(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>New Request</span>
          </Button>
        </div>

        {isRequestsLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isRequestsError ? (
          <ErrorState
            title="Failed to load service requests"
            message="Could not load your service request history."
            onRetry={refetchRequests}
          />
        ) : serviceRequests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No service requests logged"
            message="You currently have no open or past maintenance requests on file."
            action={
              <Button variant="primary" size="sm" onClick={() => setRequestModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Submit Your First Request
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Service Scope</th>
                  <th className="py-2.5 px-3">Urgency</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3">Location / Bay</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {serviceRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {req.request_code || req.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {req.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {req.description}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={getUrgencyBadgeVariant(req.urgency)} size="sm">
                        {req.urgency}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={getStatusBadgeVariant(req.status)} size="sm">
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {req.location || 'Main Facility'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setSelectedRequestId(req.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                        <span>Track Status</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Permitted Project Progress Updates */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-500" />
            <span>Permitted Project Updates</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status milestones of facility modernization and deployment projects.
          </p>
        </div>

        {isProjectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No active project modernizations linked to your client account.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {proj.project_code || proj.id}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {proj.name}
                    </h3>
                  </div>
                  <Badge
                    variant={
                      proj.status === 'completed'
                        ? 'success'
                        : proj.health === 'on_track'
                          ? 'brand'
                          : 'warning'
                    }
                    size="sm"
                  >
                    {proj.status.replace('_', ' ')}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {proj.description || 'Facility equipment upgrade and deployment in progress.'}
                </p>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Milestone Progress</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {proj.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>

                {proj.target_date && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Target Delivery: {proj.target_date}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Recent Invoices & Billing */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Invoices & Billing Statements</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transparent breakdown of maintenance services and approved work order billings.
          </p>
        </div>

        {isInvoicesLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No invoices issued to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoice_number || inv.id}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                      {inv.issue_date || 'Recent'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                      {inv.due_date || 'Net 30'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white font-mono">
                      ${Number(inv.total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={getStatusBadgeVariant(inv.status)} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setSelectedInvoiceId(inv.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        <span>View Details</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Service Request Status Tracker Drawer */}
      <Drawer
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        title={activeRequest?.title || 'Service Request Tracking'}
        size="md"
      >
        {isRequestDetailLoading || !activeRequest ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Ticket Header */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {activeRequest.request_code || activeRequest.id}
                </span>
                <Badge variant={getStatusBadgeVariant(activeRequest.status)}>
                  {activeRequest.status}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {activeRequest.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeRequest.description}
              </p>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{activeRequest.location}</span>
              </div>
            </div>

            {/* 5-Step Visual Tracking Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Service Order Progress
              </h4>
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                {(activeRequest.timeline || []).map((stepItem, idx) => (
                  <div key={idx} className="relative">
                    {/* Step Icon */}
                    <span
                      className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        stepItem.completed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {stepItem.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {stepItem.name}
                    </div>
                    {stepItem.technician && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        Assigned Lead: {stepItem.technician}
                      </div>
                    )}
                    {stepItem.eta && (
                      <div className="text-[11px] text-slate-500 mt-0.5">ETA: {stepItem.eta}</div>
                    )}
                    {stepItem.date && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(stepItem.date).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Feedback Card / Action */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Service Experience Feedback
              </h4>
              {activeRequest.feedback ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < activeRequest.feedback.rating ? 'fill-current' : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold ml-1 text-slate-700 dark:text-slate-300">
                      {activeRequest.feedback.rating} / 5
                    </span>
                  </div>
                  {activeRequest.feedback.comments && (
                    <p className="text-slate-600 dark:text-slate-300 italic text-[11px]">
                      "{activeRequest.feedback.comments}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-500 text-[11px]">
                    Have comments or want to rate the technician's resolution on this order?
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={() => setFeedbackModalOpen(true)}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-300" />
                    <span>Submit Satisfaction Feedback</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL 2: Create Service Request */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Submit New Service Request"
        size="md"
      >
        <form onSubmit={handleRequestSubmit(onSubmitRequest)} className="space-y-4 text-xs">
          <FormInput
            label="Service Scope / Title"
            name="title"
            placeholder="e.g. Chiller Unit 4B Compressor Telemetry Alert"
            register={registerRequest}
            errors={requestErrors}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Service Category"
              name="service_type"
              register={registerRequest}
              errors={requestErrors}
              options={[
                { value: 'repair', label: 'Emergency Equipment Repair' },
                { value: 'maintenance', label: 'Scheduled Preventative Maintenance' },
                { value: 'safety', label: 'Safety Audit & Compliance Inspection' },
                { value: 'install', label: 'New Hardware / Asset Commissioning' }
              ]}
            />

            <FormSelect
              label="Service Urgency"
              name="urgency"
              register={registerRequest}
              errors={requestErrors}
              options={[
                { value: 'normal', label: 'Normal (Standard Schedule)' },
                { value: 'high', label: 'High Priority (Within 8 Hours)' },
                { value: 'urgent', label: 'Urgent Priority (Within 4 Hours)' },
                { value: 'critical', label: 'Critical Outage (Immediate Dispatch)' }
              ]}
            />
          </div>

          <FormInput
            label="Facility / Bay Location"
            name="location"
            placeholder="e.g. Main Medical Tower - Radiology Bay 3"
            register={registerRequest}
            errors={requestErrors}
            required
          />

          <FormTextarea
            label="Detailed Scope & Malfunction Description"
            name="description"
            placeholder="Describe the issue, operating symptoms, serial numbers, and any access safety requirements..."
            rows={4}
            register={registerRequest}
            errors={requestErrors}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isCreatingRequest}>
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>{isCreatingRequest ? 'Submitting...' : 'Submit to Operations'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Submit Customer Feedback */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Service Satisfaction Review"
        size="sm"
      >
        <form onSubmit={handleFeedbackSubmit(onSubmitFeedback)} className="space-y-4 text-xs">
          <FormSelect
            label="Overall Rating"
            name="rating"
            register={registerFeedback}
            errors={feedbackErrors}
            options={[
              { value: '5', label: '5 Stars - Outstanding & Fast' },
              { value: '4', label: '4 Stars - Good / Satisfied' },
              { value: '3', label: '3 Stars - Acceptable' },
              { value: '2', label: '2 Stars - Needs Improvement' },
              { value: '1', label: '1 Star - Unsatisfactory' }
            ]}
          />

          <FormTextarea
            label="Review Comments"
            name="comments"
            placeholder="Tell us about the technician's professionalism, speed of resolution, and equipment performance..."
            rows={3}
            register={registerFeedback}
            errors={feedbackErrors}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Invoice Breakdown Modal */}
      <Modal
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
        title={`Invoice ${activeInvoice?.invoice_number || ''}`}
        size="md"
      >
        {isInvoiceDetailLoading || !activeInvoice ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[11px] block">Billing Date</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {activeInvoice.issue_date || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Payment Due</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {activeInvoice.due_date || 'Net 30'}
                </span>
              </div>
              <Badge variant={getStatusBadgeVariant(activeInvoice.status)}>
                {activeInvoice.status}
              </Badge>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(activeInvoice.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ${Number(item.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        ${Number(item.total_price || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1 text-right">
              {activeInvoice.subtotal !== undefined && (
                <div className="text-slate-500 text-[11px]">
                  Subtotal: ${Number(activeInvoice.subtotal).toFixed(2)}
                </div>
              )}
              {activeInvoice.tax !== undefined && (
                <div className="text-slate-500 text-[11px]">
                  Tax: ${Number(activeInvoice.tax).toFixed(2)}
                </div>
              )}
              <div className="text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                Invoice Total: ${Number(activeInvoice.total || 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: Update Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Manage Account Profile"
        size="sm"
      >
        <form onSubmit={handleProfileSubmit(onSubmitProfile)} className="space-y-4 text-xs">
          <FormInput
            label="Contact Person Name"
            name="name"
            register={registerProfile}
            errors={profileErrors}
          />

          <FormInput
            label="Phone Number"
            name="phone"
            register={registerProfile}
            errors={profileErrors}
          />

          <FormInput
            label="Facility / Billing Address"
            name="address"
            register={registerProfile}
            errors={profileErrors}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerPortalPage;
