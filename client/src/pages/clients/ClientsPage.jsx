import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  ShieldAlert,
  Users,
  Send,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useCustomersQuery,
  useCustomerDetailQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useCustomerNotesQuery,
  useAddCustomerNoteMutation,
  useCustomerHistoryQuery,
  useUpdateCustomerFollowUpMutation,
  customerCreateSchema,
  customerUpdateSchema,
  customerNoteSchema,
  customerFollowUpSchema
} from '../../features/customers/index.js';
import {
  Badge,
  Button,
  Modal,
  Drawer,
  EmptyState,
  ErrorState,
  SkeletonTable,
  ConfirmDialog
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

const SLA_TIERS = [
  { value: 'all', label: 'All SLA Tiers' },
  { value: 'critical', label: 'Critical (2h Response)' },
  { value: 'premium', label: 'Premium (4h Response)' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'standard', label: 'Standard (24h Response)' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Account' },
  { value: 'lead', label: 'Pipeline Lead' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' }
];

export const ClientsPage = () => {
  const { currentTenant } = useTenant();
  const { isOwner, isAdmin, isManager } = useAuth();
  const canManage = isOwner || isAdmin || isManager;

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [slaFilter, setSlaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Drawer / Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'followup' | 'notes' | 'history'

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Queries
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      sla_tier: slaFilter !== 'all' ? slaFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      page,
      limit
    }),
    [debouncedSearch, slaFilter, statusFilter, page, limit]
  );

  const {
    data: customersData,
    isLoading,
    isError,
    error,
    refetch
  } = useCustomersQuery(queryFilters);
  const customers = Array.isArray(customersData) ? customersData : customersData?.data || [];
  const pagination = customersData?.pagination || { total: customers.length, totalPages: 1 };

  // Detail Query
  const { data: activeCustomer, isLoading: isDetailLoading } =
    useCustomerDetailQuery(selectedCustomerId);
  const { data: customerNotes = [], isLoading: isNotesLoading } =
    useCustomerNotesQuery(selectedCustomerId);
  const { data: customerHistory = [], isLoading: isHistoryLoading } =
    useCustomerHistoryQuery(selectedCustomerId);

  // Mutations
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const deleteMutation = useDeleteCustomerMutation();
  const addNoteMutation = useAddCustomerNoteMutation();
  const followUpMutation = useUpdateCustomerFollowUpMutation();

  // Metric KPIs
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const leads = customers.filter((c) => c.status === 'lead' || c.lead_status === 'lead').length;
    const critical = customers.filter((c) => c.sla_tier === 'critical').length;
    return { total, active, leads, critical };
  }, [customers]);

  // Create Customer Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating }
  } = useForm({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: '',
      company_name: '',
      email: '',
      phone: '',
      billing_address: '',
      sla_tier: 'standard',
      status: 'active',
      lead_status: 'active',
      follow_up_date: '',
      follow_up_notes: '',
      notes: ''
    }
  });

  // Edit Customer Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating }
  } = useForm({
    resolver: zodResolver(customerUpdateSchema)
  });

  // Add Note Form
  const {
    register: registerNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNote,
    formState: { errors: noteErrors, isSubmitting: isAddingNote }
  } = useForm({
    resolver: zodResolver(customerNoteSchema),
    defaultValues: { note: '' }
  });

  // Follow-Up Form
  const {
    register: registerFollowUp,
    handleSubmit: handleFollowUpSubmit,
    reset: resetFollowUp,
    formState: { errors: followUpErrors, isSubmitting: isUpdatingFollowUp }
  } = useForm({
    resolver: zodResolver(customerFollowUpSchema)
  });

  // Open Edit Modal with current data
  const handleOpenEdit = (customer) => {
    resetEdit({
      name: customer.name || '',
      company_name: customer.company_name || customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      billing_address:
        typeof customer.address === 'string'
          ? customer.address
          : customer.address?.street
            ? `${customer.address.street}, ${customer.address.city || ''}`
            : customer.billing_address || '',
      sla_tier: customer.sla_tier || 'standard',
      status: customer.status || 'active',
      lead_status: customer.lead_status || 'active',
      follow_up_date: customer.follow_up_date || '',
      follow_up_notes: customer.follow_up_notes || ''
    });
    setEditModalOpen(true);
  };

  const handleOpenDrawer = (customer) => {
    setSelectedCustomerId(customer.id);
    resetFollowUp({
      lead_status: customer.lead_status || 'active',
      follow_up_date: customer.follow_up_date || '',
      follow_up_notes: customer.follow_up_notes || ''
    });
  };

  const onCreateCustomer = async (data) => {
    await createMutation.mutateAsync(data);
    resetCreate();
    setCreateModalOpen(false);
  };

  const onUpdateCustomer = async (data) => {
    if (!selectedCustomerId) return;
    await updateMutation.mutateAsync({ id: selectedCustomerId, updates: data });
    setEditModalOpen(false);
  };

  const onAddNote = async (data) => {
    if (!selectedCustomerId) return;
    await addNoteMutation.mutateAsync({ customerId: selectedCustomerId, note: data.note });
    resetNote();
  };

  const onUpdateFollowUp = async (data) => {
    if (!selectedCustomerId) return;
    await followUpMutation.mutateAsync({ customerId: selectedCustomerId, data });
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    await deleteMutation.mutateAsync(customerToDelete.id);
    setDeleteConfirmOpen(false);
    if (selectedCustomerId === customerToDelete.id) {
      setSelectedCustomerId(null);
    }
    setCustomerToDelete(null);
  };

  const getSlaBadgeVariant = (tier) => {
    switch (tier) {
      case 'critical':
        return 'danger';
      case 'premium':
        return 'warning';
      case 'platinum':
      case 'gold':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'lead':
        return 'brand';
      case 'suspended':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Customer Directory & CRM
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage client profiles, SLAs, service histories, sales leads, and scheduled follow-ups
            in {currentTenant?.name || 'Operations'}.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="md"
            className="flex items-center gap-2 self-start md:self-auto shadow-sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Accounts</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Registered clients in directory</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Contracts</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active operational agreements</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pipeline Leads</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.leads}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending follow-up or conversion</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical SLAs</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.critical}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Priority 2-hour response guarantee</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {SLA_TIERS.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : isError ? (
          <div className="p-8">
            <ErrorState
              title="Unable to load customer directory"
              message={error?.apiMessage || 'An unexpected error occurred while fetching clients.'}
              onRetry={refetch}
            />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Building2}
              title="No customers match criteria"
              message="No client accounts found matching the current search filters."
              action={
                canManage ? (
                  <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Create Customer</span>
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">SLA Tier</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDrawer(c)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.company_name || c.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {c.customer_code || c.id}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {c.contact_name || c.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getSlaBadgeVariant(c.sla_tier)} size="sm">
                        {c.sla_tier || 'standard'}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={getStatusBadgeVariant(c.status)} size="sm">
                          {c.status || 'active'}
                        </Badge>
                        {c.lead_status && c.lead_status !== c.status && (
                          <Badge variant="neutral" size="sm">
                            {c.lead_status}
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {c.follow_up_date ? (
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{c.follow_up_date}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None scheduled</span>
                      )}
                    </td>

                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()} // Prevent drawer toggle when clicking action buttons
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View Profile Details"
                          onClick={() => handleOpenDrawer(c)}
                        >
                          <Eye className="w-4 h-4 text-slate-500 hover:text-indigo-600" />
                        </Button>

                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Edit Customer"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                handleOpenEdit(c);
                              }}
                            >
                              <Edit className="w-4 h-4 text-slate-500 hover:text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Delete Customer"
                              onClick={() => {
                                setCustomerToDelete(c);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {pagination.totalPages}
              </span>
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
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Profile Details Slide-out Drawer */}
      <Drawer
        isOpen={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        title={activeCustomer?.company_name || activeCustomer?.name || 'Customer Profile'}
        size="lg"
      >
        {isDetailLoading || !activeCustomer ? (
          <div className="space-y-4 p-4">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse" />
            <div className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Badge Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div>
                <span className="text-xs text-slate-400 font-mono">
                  {activeCustomer.customer_code || activeCustomer.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeCustomer.company_name || activeCustomer.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSlaBadgeVariant(activeCustomer.sla_tier)}>
                  {activeCustomer.sla_tier} SLA
                </Badge>
                <Badge variant={getStatusBadgeVariant(activeCustomer.status)}>
                  {activeCustomer.status}
                </Badge>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
              {[
                { id: 'overview', label: 'Overview & Contacts', icon: Building2 },
                { id: 'followup', label: 'Lead & Follow-Up', icon: Calendar },
                {
                  id: 'notes',
                  label: `Internal Notes (${customerNotes.length})`,
                  icon: MessageSquare
                },
                { id: 'history', label: 'History & Activity', icon: FileText }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold transition-colors ${
                      active
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Overview & Contact Info */}
            {drawerTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Primary Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Person</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeCustomer.contact_name || activeCustomer.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Email Address</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {activeCustomer.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {activeCustomer.phone || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">SLA Response Tier</span>
                      <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                        {activeCustomer.sla_tier}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Facility / Billing Address</span>
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {typeof activeCustomer.address === 'string'
                      ? activeCustomer.address
                      : activeCustomer.address?.street
                        ? `${activeCustomer.address.street}, ${activeCustomer.address.city || ''} ${activeCustomer.address.state || ''} ${activeCustomer.address.postal_code || ''}, ${activeCustomer.address.country || ''}`
                        : activeCustomer.billing_address || 'No physical address recorded.'}
                  </p>
                </div>

                {canManage && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleOpenEdit(activeCustomer)}
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit Customer Profile</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Lead & Follow-Up */}
            {drawerTab === 'followup' && (
              <form onSubmit={handleFollowUpSubmit(onUpdateFollowUp)} className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Pipeline Stage & Scheduling
                  </h4>

                  <FormSelect
                    label="Lead / Pipeline Stage"
                    name="lead_status"
                    register={registerFollowUp}
                    errors={followUpErrors}
                    options={[
                      { value: 'lead', label: 'Lead (Inquiry Received)' },
                      { value: 'prospect', label: 'Prospect (Contract Proposal)' },
                      { value: 'active', label: 'Active Client (Signed Contract)' },
                      { value: 'churned', label: 'Churned / Inactive' }
                    ]}
                  />

                  <FormInput
                    label="Scheduled Follow-Up Date"
                    name="follow_up_date"
                    type="date"
                    register={registerFollowUp}
                    errors={followUpErrors}
                  />

                  <FormTextarea
                    label="Follow-Up Notes & Agenda"
                    name="follow_up_notes"
                    placeholder="Enter discussion notes or goals for next interaction..."
                    rows={3}
                    register={registerFollowUp}
                    errors={followUpErrors}
                  />

                  {canManage && (
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isUpdatingFollowUp}
                      className="w-full"
                    >
                      {isUpdatingFollowUp ? 'Saving Follow-Up...' : 'Update Lead & Follow-Up'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* TAB 3: Internal Notes Thread */}
            {drawerTab === 'notes' && (
              <div className="space-y-4 text-xs">
                {canManage && (
                  <form
                    onSubmit={handleNoteSubmit(onAddNote)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2"
                  >
                    <FormTextarea
                      name="note"
                      placeholder="Add an internal note about this customer (visible to operations staff only)..."
                      rows={2}
                      register={registerNote}
                      errors={noteErrors}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isAddingNote}
                        className="flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAddingNote ? 'Saving...' : 'Post Note'}</span>
                      </Button>
                    </div>
                  </form>
                )}

                {isNotesLoading ? (
                  <div className="text-slate-400 py-4 text-center">Loading customer notes...</div>
                ) : customerNotes.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No internal notes logged for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customerNotes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {n.author_name || 'Staff Member'}
                          </span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {n.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: History & Activity */}
            {drawerTab === 'history' && (
              <div className="space-y-3 text-xs">
                {isHistoryLoading ? (
                  <div className="text-slate-400 py-4 text-center">Loading activity log...</div>
                ) : customerHistory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No orders or service activity logged for this client yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === 'completed' || item.status === 'paid'
                              ? 'success'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Customer Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Customer / Client"
        size="md"
      >
        <form onSubmit={handleCreateSubmit(onCreateCustomer)} className="space-y-4 text-xs">
          <FormInput
            label="Company Name"
            name="company_name"
            placeholder="e.g. Metro Health System Inc."
            register={registerCreate}
            errors={createErrors}
            required
          />

          <FormInput
            label="Primary Contact Person"
            name="name"
            placeholder="e.g. Dr. Rachel Green"
            register={registerCreate}
            errors={createErrors}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Contact Email"
              name="email"
              type="email"
              placeholder="rachel@metrohealth.com"
              register={registerCreate}
              errors={createErrors}
              required
            />

            <FormInput
              label="Contact Phone"
              name="phone"
              placeholder="+1 (555) 0199"
              register={registerCreate}
              errors={createErrors}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="SLA Response Guarantee"
              name="sla_tier"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: 'standard', label: 'Standard (24h)' },
                { value: 'silver', label: 'Silver (12h)' },
                { value: 'gold', label: 'Gold (8h)' },
                { value: 'platinum', label: 'Platinum (4h)' },
                { value: 'premium', label: 'Premium (4h)' },
                { value: 'critical', label: 'Critical Outage (2h)' }
              ]}
            />

            <FormSelect
              label="Initial Account Status"
              name="status"
              register={registerCreate}
              errors={createErrors}
              options={[
                { value: 'active', label: 'Active Account' },
                { value: 'lead', label: 'Pipeline Lead' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>

          <FormInput
            label="Facility / Billing Address"
            name="billing_address"
            placeholder="e.g. 742 Evergreen Terrace, Metropolis, NY 10001"
            register={registerCreate}
            errors={createErrors}
          />

          <FormTextarea
            label="Initial Account Notes"
            name="notes"
            placeholder="Key equipment details, facilities access protocols, or service scopes..."
            rows={2}
            register={registerCreate}
            errors={createErrors}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isCreating}>
              {isCreating ? 'Creating Customer...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Customer Profile"
        size="md"
      >
        <form onSubmit={handleEditSubmit(onUpdateCustomer)} className="space-y-4 text-xs">
          <FormInput
            label="Company Name"
            name="company_name"
            register={registerEdit}
            errors={editErrors}
          />

          <FormInput
            label="Primary Contact Person"
            name="name"
            register={registerEdit}
            errors={editErrors}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Contact Email"
              name="email"
              type="email"
              register={registerEdit}
              errors={editErrors}
            />

            <FormInput
              label="Contact Phone"
              name="phone"
              register={registerEdit}
              errors={editErrors}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="SLA Response Guarantee"
              name="sla_tier"
              register={registerEdit}
              errors={editErrors}
              options={[
                { value: 'standard', label: 'Standard (24h)' },
                { value: 'silver', label: 'Silver (12h)' },
                { value: 'gold', label: 'Gold (8h)' },
                { value: 'platinum', label: 'Platinum (4h)' },
                { value: 'premium', label: 'Premium (4h)' },
                { value: 'critical', label: 'Critical Outage (2h)' }
              ]}
            />

            <FormSelect
              label="Account Status"
              name="status"
              register={registerEdit}
              errors={editErrors}
              options={[
                { value: 'active', label: 'Active Account' },
                { value: 'lead', label: 'Pipeline Lead' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
          </div>

          <FormInput
            label="Billing / Facility Address"
            name="billing_address"
            register={registerEdit}
            errors={editErrors}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Archive Customer Profile"
        message={`Are you sure you want to archive "${customerToDelete?.company_name || customerToDelete?.name}"? Associated service requests and history will remain preserved.`}
        confirmText="Archive Account"
        variant="danger"
        icon={AlertCircle}
      />
    </div>
  );
};

export default ClientsPage;
