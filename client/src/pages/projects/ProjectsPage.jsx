import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Briefcase,
  Plus,
  Search,
  ArrowRight,
  TrendingUp,
  DollarSign,
  User,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useProjectsQuery,
  useCreateProjectMutation,
  projectCreateSchema
} from '../../features/projects/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';
import {
  Card,
  Badge,
  Button,
  Modal,
  SkeletonTable,
  EmptyState,
  ErrorState
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { isOwner, isAdmin, isManager } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Queries
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      health: healthFilter !== 'all' ? healthFilter : undefined
    }),
    [debouncedSearch, statusFilter, healthFilter]
  );

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useProjectsQuery(queryFilters);

  const { data: employees = [] } = useEmployeesQuery();
  const createProjectMutation = useCreateProjectMutation();

  // Create Project Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: '',
      client: '',
      description: '',
      status: 'planning',
      health: 'on_track',
      budget: 50000,
      spent: 0,
      progress: 0,
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      lead_id: '',
      lead: ''
    }
  });

  const onSubmitCreate = (data) => {
    const selectedEmp = employees.find((e) => e.id === data.lead_id);
    const payload = {
      ...data,
      lead: selectedEmp
        ? selectedEmp.name || `${selectedEmp.first_name} ${selectedEmp.last_name}`
        : data.lead || 'Alex Rivera'
    };

    createProjectMutation.mutate(payload, {
      onSuccess: () => {
        setModalOpen(false);
        reset();
      }
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    const total = list.length;
    const inProgress = list.filter((p) => p.status === 'in_progress').length;
    const onTrack = list.filter((p) => p.health === 'on_track').length;
    const totalBudget = list.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);

    return { total, inProgress, onTrack, totalBudget };
  }, [projects]);

  const canManageProjects = isOwner || isAdmin || isManager;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Briefcase className="w-3 h-3" />
            <span>Multi-Tenant Operations Projects</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Projects & Milestones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track multi-phase enterprise client installations, budgets, and milestone schedules for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        {canManageProjects && (
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 font-medium">Enterprise operations</div>
        </Card>

        <Card hover className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {metrics.inProgress}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Active installations</div>
        </Card>

        <Card hover className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">On-Track Health</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.onTrack}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Within SLA delivery</div>
        </Card>

        <Card hover className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Allocated</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            ${(metrics.totalBudget / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Budget commitment</div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, code or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="all">All Health Signals</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Projects Grid / List */}
      {projectsLoading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : projectsError ? (
        <ErrorState
          message={projectsError.apiMessage || 'Could not load projects.'}
          onRetry={refetchProjects}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Adjust your search criteria or create an operations project."
          actionLabel={canManageProjects ? 'Create Project' : undefined}
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const healthColor =
              project.health === 'on_track'
                ? 'success'
                : project.health === 'at_risk'
                  ? 'warning'
                  : 'danger';

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {project.project_code || project.id}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <Badge variant={healthColor} size="sm" dot>
                    {(project.health || 'on_track').replace('_', ' ')}
                  </Badge>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{project.client || 'Enterprise Client'}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Milestone Progress</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {project.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${project.progress || 0}%` }}
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* Financial and Schedule details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Budget:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      ${Number(project.budget || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Delivery:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {project.target_date || 'Q4 2026'}
                    </span>
                  </div>
                </div>

                {/* Lead and Action footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lead: {project.lead || 'Sarah Chen'}</span>
                  </div>

                  <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Initiate Operations Project"
        description="Provision a new enterprise deployment project, set budget milestones, and allocate crew."
      >
        <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4">
          <FormInput
            label="Project Title"
            placeholder="e.g. Metro Distribution Center Automation"
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              label="Client Partner"
              placeholder="e.g. Metro Retail Co."
              {...register('client')}
              error={errors.client?.message}
              required
            />

            <FormSelect
              label="Delivery Lead"
              {...register('lead_id')}
              options={[
                { value: '', label: 'Select Project Lead...' },
                ...employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.name || `${emp.first_name} ${emp.last_name}`} (${emp.department || 'Operations'})`
                }))
              ]}
              error={errors.lead_id?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormInput
              label="Budget Allocation ($)"
              type="number"
              placeholder="75000"
              {...register('budget')}
              error={errors.budget?.message}
              required
            />

            <FormSelect
              label="Initial Status"
              {...register('status')}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'on_hold', label: 'On Hold' }
              ]}
            />

            <FormInput
              label="Target Completion"
              type="date"
              {...register('target_date')}
              error={errors.target_date?.message}
              required
            />
          </div>

          <FormTextarea
            label="Scope & Technical Specifications"
            rows={3}
            placeholder="Outline installation phases, sensor hardware, and regulatory deliverables..."
            {...register('description')}
          />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={createProjectMutation.isPending}
              disabled={createProjectMutation.isPending}
            >
              Initiate Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
