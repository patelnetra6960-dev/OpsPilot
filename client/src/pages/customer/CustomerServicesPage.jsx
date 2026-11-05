import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Plus,
  Search,
  Star,
  CheckCircle2,
  MapPin,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useCustomerServiceRequestsQuery,
  useCustomerServiceRequestDetailQuery,
  useSubmitCustomerFeedbackMutation,
  serviceRequestFeedbackSchema
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
import { FormSelect, FormTextarea } from '../../components/form/index.js';

export const CustomerServicesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryFilters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined
    }),
    [searchTerm, statusFilter, urgencyFilter]
  );

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch
  } = useCustomerServiceRequestsQuery(queryFilters);

  const { data: activeRequest, isLoading: isDetailLoading } =
    useCustomerServiceRequestDetailQuery(selectedRequestId);

  const submitFeedbackMutation = useSubmitCustomerFeedbackMutation();

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

  // Local pagination
  const totalPages = Math.ceil(requests.length / limit) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * limit;
    return requests.slice(start, start + limit);
  }, [requests, page, limit]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Link
            to="/customer"
            className="inline-flex items-center text-xs text-slate-500 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Customer Portal Home</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            <span>Service Requests & Work Orders</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track operational triage, dispatched technician ETA, and historic maintenance orders.
          </p>
        </div>

        <Link to="/customer/request">
          <Button variant="primary" size="md" className="flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Request Service</span>
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New Ticket</option>
            <option value="in_review">In Triage</option>
            <option value="assigned">Dispatched / Assigned</option>
            <option value="closed">Closed / Completed</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Urgencies</option>
            <option value="critical">Critical (Immediate)</option>
            <option value="urgent">Urgent (4h)</option>
            <option value="high">High (8h)</option>
            <option value="normal">Normal (24h)</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Failed to load service requests"
              message={error?.apiMessage || 'Could not fetch your service requests.'}
              onRetry={refetch}
            />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="No service requests found"
              message="No service requests match the selected search filters."
              action={
                <Link to="/customer/request">
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Create Service Request</span>
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Service Scope</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Facility Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {req.request_code || req.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {req.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {req.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700 dark:text-slate-300">
                      {req.service_type || 'Repair'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getUrgencyBadgeVariant(req.urgency)} size="sm">
                        {req.urgency}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusBadgeVariant(req.status)} size="sm">
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {req.location || 'Main Site'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setSelectedRequestId(req.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                        <span>Track</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tracker Drawer */}
      <Drawer
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        title={activeRequest?.title || 'Service Request Tracking'}
        size="md"
      >
        {isDetailLoading || !activeRequest ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 text-xs">
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

            {/* Tracking Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Service Order Progress
              </h4>
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                {(activeRequest.timeline || []).map((stepItem, idx) => (
                  <div key={idx} className="relative">
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

            {/* Feedback section */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                Customer Feedback & Rating
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
                  <p className="text-slate-500 text-[11px]">How was the service on this ticket?</p>
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

      {/* Feedback Modal */}
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
            placeholder="Share feedback on resolution speed, technician communication, and quality..."
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
    </div>
  );
};

export default CustomerServicesPage;
