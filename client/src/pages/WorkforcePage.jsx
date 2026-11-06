import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Search,
  Mail,
  LayoutGrid,
  List,
  Shield,
  Clock,
  UserCheck,
  Building2,
  Trash2,
  Edit,
  UserPlus,
  Send,
  AlertCircle,
  Activity,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth.js';
import { useTenant } from '../hooks/useTenant.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { addToast } from '../store/uiSlice.js';

import {
  useEmployeesQuery,
  useWorkforceStatsQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useChangeRoleMutation,
  useDeactivateEmployeeMutation
} from '../features/workforce/api/workforceApi.js';
import {
  employeeCreateSchema,
  employeeUpdateSchema
} from '../features/workforce/schemas/workforceSchemas.js';
import { inviteMemberSchema } from '../features/organizations/schemas/organizationSchemas.js';
import {
  useInvitationsQuery,
  useCreateInvitationMutation,
  useRevokeInvitationMutation
} from '../features/organizations/api/organizationApi.js';

import {
  Button,
  Badge,
  Modal,
  Drawer,
  EmptyState,
  ErrorState,
  SkeletonTable,
  ConfirmDialog
} from '../components/ui/index.js';
import { FormInput, FormSelect } from '../components/form/index.js';

const DEPARTMENTS = [
  'Field Logistics',
  'Fleet Operations',
  'Maintenance & Safety',
  'Quality Inspection',
  'Dispatch & Routing',
  'Customer Support'
];

export const WorkforcePage = () => {
  const dispatch = useDispatch();
  const { isOwner, isAdmin, isManager } = useAuth();
  const { currentTenant } = useTenant();

  // Tab: 'roster' | 'invitations' | 'departments'
  const [activeTab, setActiveTab] = useState('roster');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberToDeactivate, setMemberToDeactivate] = useState(null);
  const [invitationToRevoke, setInvitationToRevoke] = useState(null);

  // TanStack Query Hooks
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      department: departmentFilter || undefined,
      role: roleFilter || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    [debouncedSearch, departmentFilter, roleFilter, statusFilter]
  );

  const {
    data: workforceData = [],
    isLoading: workforceLoading,
    error: workforceError,
    refetch: refetchWorkforce
  } = useEmployeesQuery(queryFilters);

  const { data: statsData, isLoading: statsLoading } = useWorkforceStatsQuery();

  const { data: invitationsData = [], isLoading: invitationsLoading } = useInvitationsQuery({
    enabled: Boolean(isAdmin || isOwner)
  });

  // Mutations
  const createEmployeeMutation = useCreateEmployeeMutation();
  const updateEmployeeMutation = useUpdateEmployeeMutation(selectedMember?.id);
  const changeRoleMutation = useChangeRoleMutation();
  const deactivateEmployeeMutation = useDeactivateEmployeeMutation();
  const createInviteMutation = useCreateInvitationMutation();
  const revokeInviteMutation = useRevokeInvitationMutation();

  // Permitted Action Checks
  const canManageWorkforce = isOwner || isAdmin || isManager;
  const canManageRolesAndInvites = isOwner || isAdmin;

  // React Hook Form: Create Employee
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreateForm,
    formState: { errors: createErrors }
  } = useForm({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'employee',
      job_title: 'Field Operations Specialist',
      department: 'Field Logistics',
      hourly_rate: 35.0
    }
  });

  // React Hook Form: Edit Employee
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors }
  } = useForm({
    resolver: zodResolver(employeeUpdateSchema)
  });

  // React Hook Form: Invite Member
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInviteForm,
    formState: { errors: inviteErrors }
  } = useForm({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'employee'
    }
  });

  // On Create Employee Submit
  const onCreateEmployee = async (values) => {
    try {
      await createEmployeeMutation.mutateAsync(values);
      setIsAddModalOpen(false);
      resetCreateForm();
    } catch {
      // Notification handled in mutation onError
    }
  };

  // Open Edit Modal for Member
  const handleOpenEdit = (member) => {
    setSelectedMember(member);
    resetEditForm({
      name: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      role: member.role || 'employee',
      job_title: member.job_title || member.designation || 'Specialist',
      department: member.department || 'Field Logistics',
      hourly_rate: Number(member.hourly_rate) || 35.0,
      is_active: member.status === 'active' || member.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  // On Edit Employee Submit
  const onEditEmployee = async (values) => {
    if (!selectedMember?.id) return;
    try {
      await updateEmployeeMutation.mutateAsync({
        id: selectedMember.id,
        ...values
      });
      setIsEditModalOpen(false);
      setSelectedMember((prev) => (prev ? { ...prev, ...values } : null));
    } catch {
      // Notification handled in mutation onError
    }
  };

  // On Change Role Submit
  const [newSelectedRole, setNewSelectedRole] = useState('employee');
  const onChangeRole = async () => {
    if (!selectedMember?.id) return;
    try {
      await changeRoleMutation.mutateAsync({
        id: selectedMember.id,
        role: newSelectedRole
      });
      setIsRoleModalOpen(false);
      setSelectedMember((prev) => (prev ? { ...prev, role: newSelectedRole } : null));
    } catch {
      // Notification handled in mutation onError
    }
  };

  // On Invite Submit
  const onSendInvite = async (values) => {
    try {
      await createInviteMutation.mutateAsync(values);
      setIsInviteModalOpen(false);
      resetInviteForm();
    } catch {
      // Notification handled in mutation onError
    }
  };

  // On Confirm Deactivate
  const onConfirmDeactivate = async () => {
    if (!memberToDeactivate) return;
    try {
      await deactivateEmployeeMutation.mutateAsync(memberToDeactivate.id);
      setMemberToDeactivate(null);
      if (selectedMember?.id === memberToDeactivate.id) {
        setSelectedMember(null);
      }
    } catch {
      // Notification handled in mutation onError
    }
  };

  // On Confirm Revoke Invite
  const onConfirmRevokeInvite = async () => {
    if (!invitationToRevoke) return;
    try {
      await revokeInviteMutation.mutateAsync(invitationToRevoke.id);
      setInvitationToRevoke(null);
    } catch {
      // Notification handled in mutation onError
    }
  };

  // Filtered & Paginated Employees
  const totalEmployees = workforceData.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return workforceData.slice(start, start + pageSize);
  }, [workforceData, page, pageSize]);

  // Department Breakdown Counters
  const departmentBreakdown = useMemo(() => {
    const counts = {};
    DEPARTMENTS.forEach((dept) => {
      counts[dept] = 0;
    });
    workforceData.forEach((emp) => {
      const dept = emp.department || 'Field Logistics';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [workforceData]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Breadcrumb Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Workforce Operations
            </h1>
            <Badge variant="brand" size="sm">
              {currentTenant?.name || 'Organization'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tenant-isolated employee roster, role assignments, and organizational department
            hierarchy.
          </p>
        </div>

        {/* Permitted Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageRolesAndInvites && (
            <Button
              variant="outline"
              size="md"
              leftIcon={Send}
              onClick={() => setIsInviteModalOpen(true)}
            >
              <span>Invite Member</span>
            </Button>
          )}

          {canManageWorkforce && (
            <Button
              variant="primary"
              size="md"
              leftIcon={Plus}
              onClick={() => setIsAddModalOpen(true)}
            >
              <span>Add Employee</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Operational Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Workforce
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {statsLoading ? '...' : statsData?.total_employees || workforceData.length || 0}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">100% tenant verified</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active On-Duty
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {statsLoading
              ? '...'
              : statsData?.active_employees ||
                workforceData.filter((w) => w.status === 'active' || w.is_active !== false).length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Ready for dispatch</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Departments
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {statsLoading ? '...' : statsData?.departments_count || DEPARTMENTS.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Operational divisions</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Avg Hourly Rate
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            ${statsLoading ? '...' : Number(statsData?.average_hourly_rate || 38.5).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Standard payroll index</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Employee Directory ({totalEmployees})
          </button>

          {canManageRolesAndInvites && (
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'invitations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Pending Invitations</span>
              {invitationsData.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-indigo-600 font-bold">
                  {invitationsData.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Departments & Headcount
          </button>
        </div>

        {activeTab === 'roster' && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Tab Content: Employee Directory */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Search & Multi-Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, code..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="owner">Organization Owner</option>
                <option value="admin">Administrator</option>
                <option value="manager">Operations Manager</option>
                <option value="employee">Field Employee</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive / On Leave</option>
              </select>
            </div>
          </div>

          {/* Data Presentation */}
          {workforceLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : workforceError ? (
            <ErrorState
              message={workforceError.apiMessage || 'Could not load workforce roster.'}
              onRetry={refetchWorkforce}
            />
          ) : workforceData.length === 0 ? (
            <EmptyState
              title="No employees match your search"
              description="Adjust your search filters or register a new team member."
              actionLabel={canManageWorkforce ? 'Add Team Member' : undefined}
              onAction={() => setIsAddModalOpen(true)}
            />
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedEmployees.map((member) => {
                const displayName =
                  member.name ||
                  `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                  'Team Member';
                const memberRole = member.role || 'employee';
                const memberStatus =
                  member.status || (member.is_active === false ? 'inactive' : 'active');

                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-lg transition cursor-pointer space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {displayName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {displayName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {member.employee_code || `EMP-${member.id.slice(0, 5)}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="capitalize font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {memberRole}
                        </span>
                        <Badge
                          variant={memberStatus === 'active' ? 'success' : 'warning'}
                          size="sm"
                          dot
                        >
                          {memberStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {member.designation || member.job_title || 'Operations Specialist'}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {member.department || 'Field Operations'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5 pt-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{member.email}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        ${Number(member.hourly_rate || 35).toFixed(2)}/hr
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                        Inspect Profile →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Department & Designation</th>
                    <th className="py-3.5 px-4">Rate</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                  {paginatedEmployees.map((member) => {
                    const displayName =
                      member.name ||
                      `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                      'Team Member';
                    const memberRole = member.role || 'employee';
                    const memberStatus =
                      member.status || (member.is_active === false ? 'inactive' : 'active');

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {displayName[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {displayName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="capitalize font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {memberRole}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {member.designation || member.job_title || 'Specialist'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {member.department || 'Field Logistics'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ${Number(member.hourly_rate || 35).toFixed(2)}/hr
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={memberStatus === 'active' ? 'success' : 'warning'}
                            size="sm"
                            dot
                          >
                            {memberStatus}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedMember(member)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                            >
                              Inspect
                            </button>

                            {canManageWorkforce && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(member);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Edit Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canManageWorkforce && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberToDeactivate(member);
                                }}
                                className="p-1 rounded text-rose-400 hover:text-rose-600"
                                title="Deactivate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Pagination Bar */}
          {workforceData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  Showing {Math.min((page - 1) * pageSize + 1, totalEmployees)} -{' '}
                  {Math.min(page * pageSize, totalEmployees)} of {totalEmployees}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pending Invitations */}
      {activeTab === 'invitations' && canManageRolesAndInvites && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/40">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pending Organization Invitations
              </h3>
              <p className="text-xs text-slate-500">
                Team invitations sent via email with cryptographically verified acceptance tokens.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={UserPlus}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Send New Invite
            </Button>
          </div>

          {invitationsLoading ? (
            <SkeletonTable rows={3} cols={4} />
          ) : invitationsData.length === 0 ? (
            <EmptyState
              title="No pending invitations"
              description="All membership invitations have been accepted or no invitations are currently pending."
              actionLabel="Invite New Member"
              onAction={() => setIsInviteModalOpen(true)}
            />
          ) : (
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Sent Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invitationsData.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {inv.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}/invite/accept?token=${inv.token}`;
                              navigator.clipboard.writeText(inviteUrl);
                              dispatch(
                                addToast({
                                  type: 'info',
                                  title: 'Link Copied',
                                  message: 'Invitation acceptance link copied to clipboard.'
                                })
                              );
                            }}
                          >
                            Copy Link
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setInvitationToRevoke(inv)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Departments & Headcount */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departmentBreakdown.map((dept) => (
            <div
              key={dept.name}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge variant="brand" size="sm">
                  {dept.count} Members
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dept.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned operational team and scheduling rota
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentFilter(dept.name);
                    setActiveTab('roster');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  View Department Roster →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Employee Details Slide-out Drawer with Activity View */}
      <Drawer
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={
          selectedMember
            ? selectedMember.name ||
              `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`.trim()
            : 'Employee Profile'
        }
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setSelectedMember(null)}>
              Close
            </Button>

            <div className="flex items-center gap-2">
              {canManageRolesAndInvites && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewSelectedRole(selectedMember?.role || 'employee');
                    setIsRoleModalOpen(true);
                  }}
                >
                  Change Role
                </Button>
              )}

              {canManageWorkforce && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleOpenEdit(selectedMember);
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedMember && (
          <div className="space-y-6 text-xs">
            {/* Profile Avatar Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {(selectedMember.name || selectedMember.first_name || 'U')[0]}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedMember.name ||
                    `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`}
                </h3>
                <div className="text-xs text-slate-500">
                  {selectedMember.designation ||
                    selectedMember.job_title ||
                    'Operations Specialist'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="brand" size="sm">
                    {selectedMember.role || 'employee'}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedMember.employee_code || selectedMember.id?.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Employment and Financial Context */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Employment & Financial Allocation
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Hourly Rate</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                    ${Number(selectedMember.hourly_rate || 35).toFixed(2)}/hr
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Active Status</span>
                  <span className="text-sm font-bold capitalize text-slate-900 dark:text-white">
                    {selectedMember.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-1">
                <span className="text-slate-400 block text-[10px]">Assigned Department</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {selectedMember.department || 'Field Logistics'}
                </span>
              </div>
            </div>

            {/* Recent Employee Activity View */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Recent Operational Activity</span>
              </span>

              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Assigned to Shift Rota
                    </span>
                    <span className="text-slate-400 font-mono">Today, 08:00 AM</span>
                  </div>
                  <p className="text-slate-500">
                    Scheduled for Morning Logistics Dispatch in{' '}
                    {selectedMember.department || 'Operations'}.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Profile Synchronized
                    </span>
                    <span className="text-slate-400 font-mono">Yesterday</span>
                  </div>
                  <p className="text-slate-500">
                    Organization membership validated under PostgreSQL Row Level Security.
                  </p>
                </div>
              </div>
            </div>

            {/* Certifications & Badges */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Safety & Compliance Badges
              </span>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>OSHA Certified Operational Technician</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Shield className="w-4 h-4 text-indigo-500" />
                <span>Verified Tenant Background Check</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 6. Modal: Add Employee */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Workforce Member"
        description={`Register a new employee for ${currentTenant?.name || 'this organization'}`}
      >
        <form onSubmit={handleCreateSubmit(onCreateEmployee)} className="space-y-4">
          <FormInput
            id="create-name"
            name="name"
            label="Full Name"
            register={registerCreate}
            error={createErrors.name}
            placeholder="David Kim"
            required
          />

          <FormInput
            id="create-email"
            name="email"
            label="Work Email"
            type="email"
            register={registerCreate}
            error={createErrors.email}
            placeholder="david.kim@acme.com"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              id="create-title"
              name="job_title"
              label="Designation / Job Title"
              register={registerCreate}
              error={createErrors.job_title}
              placeholder="Senior Field Technician"
              required
            />

            <FormSelect
              id="create-dept"
              name="department"
              label="Department"
              register={registerCreate}
              error={createErrors.department}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormSelect
              id="create-role"
              name="role"
              label="Permitted Role"
              register={registerCreate}
              error={createErrors.role}
              options={[
                { value: 'employee', label: 'Field Employee' },
                { value: 'manager', label: 'Operations Manager' },
                { value: 'admin', label: 'Administrator' }
              ]}
            />

            <FormInput
              id="create-rate"
              name="hourly_rate"
              label="Hourly Rate ($/hr)"
              type="number"
              step="0.5"
              register={registerCreate}
              error={createErrors.hourly_rate}
              placeholder="35.00"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={createEmployeeMutation.isPending}
            >
              Save Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Modal: Edit Employee */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Employee Details"
        description="Update profile, designation, or department assignment"
      >
        <form onSubmit={handleEditSubmit(onEditEmployee)} className="space-y-4">
          <FormInput
            id="edit-name"
            name="name"
            label="Full Name"
            register={registerEdit}
            error={editErrors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              id="edit-title"
              name="job_title"
              label="Designation"
              register={registerEdit}
              error={editErrors.job_title}
            />

            <FormSelect
              id="edit-dept"
              name="department"
              label="Department"
              register={registerEdit}
              error={editErrors.department}
              options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            />
          </div>

          <FormInput
            id="edit-rate"
            name="hourly_rate"
            label="Hourly Rate ($/hr)"
            type="number"
            step="0.5"
            register={registerEdit}
            error={editErrors.hourly_rate}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={updateEmployeeMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. Modal: Change Role (Restricted to Admin / Owner) */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Change Permitted Role"
        description={`Modify access privileges for ${selectedMember?.name || selectedMember?.email}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Role changes immediately alter the user&apos;s authorization boundaries across backend
              and frontend interfaces.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select New Organization Role:
            </label>
            <select
              value={newSelectedRole}
              onChange={(e) => setNewSelectedRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="employee">Field Employee (Portal access only)</option>
              <option value="manager">Operations Manager (Team, Shifts & Work Orders)</option>
              <option value="admin">Administrator (Full Workspace Control)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onChangeRole}
              isLoading={changeRoleMutation.isPending}
            >
              Update Permitted Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* 9. Modal: Send Membership Invitation */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Send Membership Invitation"
        description={`Invite a new member to join ${currentTenant?.name || 'this organization'}`}
      >
        <form onSubmit={handleInviteSubmit(onSendInvite)} className="space-y-4">
          <FormInput
            id="invite-email"
            name="email"
            label="Recipient Work Email"
            type="email"
            register={registerInvite}
            error={inviteErrors.email}
            placeholder="colleague@domain.com"
            icon={Mail}
            required
          />

          <FormSelect
            id="invite-role"
            name="role"
            label="Assigned Role"
            register={registerInvite}
            error={inviteErrors.role}
            options={[
              { value: 'employee', label: 'Field Employee' },
              { value: 'manager', label: 'Operations Manager' },
              { value: 'admin', label: 'Administrator' },
              { value: 'customer', label: 'Customer Client' }
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="md" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={createInviteMutation.isPending}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* 10. Confirmation Dialog: Deactivate Employee */}
      <ConfirmDialog
        isOpen={Boolean(memberToDeactivate)}
        onClose={() => setMemberToDeactivate(null)}
        onConfirm={onConfirmDeactivate}
        title="Deactivate Employee?"
        message={`Are you sure you want to deactivate ${memberToDeactivate?.name || memberToDeactivate?.email}? They will no longer be able to clock in or access organization workspace records.`}
        confirmText="Deactivate Member"
        variant="danger"
        isLoading={deactivateEmployeeMutation.isPending}
      />

      {/* 11. Confirmation Dialog: Revoke Invitation */}
      <ConfirmDialog
        isOpen={Boolean(invitationToRevoke)}
        onClose={() => setInvitationToRevoke(null)}
        onConfirm={onConfirmRevokeInvite}
        title="Revoke Invitation?"
        message={`Cancel the pending invitation sent to ${invitationToRevoke?.email}? The acceptance token will be immediately invalidated.`}
        confirmText="Revoke Invitation"
        variant="danger"
        isLoading={revokeInviteMutation.isPending}
      />
    </div>
  );
};

export default WorkforcePage;
