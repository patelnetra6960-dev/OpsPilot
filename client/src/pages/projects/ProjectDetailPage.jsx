import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Calendar,
  ArrowRight,
  Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import {
  useProjectDetailQuery,
  useProjectMilestonesQuery,
  useAddProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
  useProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  projectMilestoneSchema,
  projectMemberSchema
} from '../../features/projects/index.js';
import { useTasksQuery } from '../../features/tasks/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';
import {
  Badge,
  Button,
  Modal,
  Skeleton,
  EmptyState,
  ErrorState,
  ConfirmDialog
} from '../../components/ui/index.js';
import { FormInput, FormSelect } from '../../components/form/index.js';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner, isAdmin, isManager } = useAuth();

  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'team' | 'tasks'
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Queries
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject
  } = useProjectDetailQuery(id);

  const { data: milestones = [], isLoading: milestonesLoading } = useProjectMilestonesQuery(id);
  const { data: members = [], isLoading: membersLoading } = useProjectMembersQuery(id);
  const { data: tasks = [] } = useTasksQuery({ project_id: id });
  const { data: employees = [] } = useEmployeesQuery();

  // Mutations
  const addMilestoneMutation = useAddProjectMilestoneMutation(id);
  const updateMilestoneMutation = useUpdateProjectMilestoneMutation(id);
  const addMemberMutation = useAddProjectMemberMutation(id);
  const removeMemberMutation = useRemoveProjectMemberMutation(id);

  // Milestone Form
  const {
    register: registerMilestone,
    handleSubmit: handleSubmitMilestone,
    reset: resetMilestone,
    formState: { errors: milestoneErrors }
  } = useForm({
    resolver: zodResolver(projectMilestoneSchema),
    defaultValues: {
      title: '',
      target_date: '',
      status: 'pending'
    }
  });

  // Member Form
  const {
    register: registerMember,
    handleSubmit: handleSubmitMember,
    reset: resetMember,
    formState: { errors: memberErrors }
  } = useForm({
    resolver: zodResolver(projectMemberSchema),
    defaultValues: {
      workforce_member_id: '',
      project_role: 'Technician'
    }
  });

  const onSubmitMilestone = (data) => {
    addMilestoneMutation.mutate(data, {
      onSuccess: () => {
        setMilestoneModalOpen(false);
        resetMilestone();
      }
    });
  };

  const onSubmitMember = (data) => {
    addMemberMutation.mutate(data, {
      onSuccess: () => {
        setMemberModalOpen(false);
        resetMember();
      }
    });
  };

  const handleToggleMilestone = (milestone) => {
    const nextStatus = milestone.status === 'completed' ? 'in_progress' : 'completed';
    updateMilestoneMutation.mutate({
      milestoneId: milestone.id,
      updates: { status: nextStatus }
    });
  };

  const canManageProject = isOwner || isAdmin || isManager;

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <ErrorState
        title="Project Not Found"
        message={projectError?.apiMessage || 'Could not load project details.'}
        onRetry={refetchProject}
      />
    );
  }

  const healthColor =
    project.health === 'on_track' ? 'success' : project.health === 'at_risk' ? 'warning' : 'danger';

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 font-mono">Back to Projects Directory</span>
      </div>

      {/* Project Overview Card */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {project.project_code || project.id}
              </span>
              <Badge variant={healthColor} size="sm" dot>
                {(project.health || 'on_track').replace('_', ' ')}
              </Badge>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {project.status || 'planning'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Client Partner: <strong>{project.client || 'Enterprise Partner'}</strong> • Lead:{' '}
              {project.lead || 'Sarah Chen'}
            </p>
          </div>

          {canManageProject && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMemberModalOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Assign Crew</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => setMilestoneModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Milestone</span>
              </Button>
            </div>
          )}
        </div>

        {/* Progress and KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 space-y-2">
            <span className="text-slate-400 text-xs font-semibold block">Milestone Delivery</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {project.progress || 0}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                style={{ width: `${project.progress || 0}%` }}
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 space-y-1">
            <span className="text-slate-400 text-xs font-semibold block">Budget vs Spent</span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              ${Number(project.spent || 0).toLocaleString()} / $
              {Number(project.budget || 0).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">
              {Number(project.budget) > 0
                ? `${Math.round(((project.spent || 0) / project.budget) * 100)}% utilized`
                : 'Budget pending'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 space-y-1">
            <span className="text-slate-400 text-xs font-semibold block">Target Delivery</span>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {project.target_date || 'Q4 2026'}
            </div>
            <span className="text-[11px] text-slate-400">
              Start: {project.start_date || 'Active'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 space-y-1">
            <span className="text-slate-400 text-xs font-semibold block">Assigned Crew</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {members.length} Members
            </div>
            <span className="text-[11px] text-slate-400">{tasks.length} active tasks linked</span>
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            {project.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'milestones'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Milestones ({milestones.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'team'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Crew & Members ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Linked Tasks ({tasks.length})</span>
        </button>
      </div>

      {/* Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Project Delivery Milestones
            </h2>
            {canManageProject && (
              <Button variant="secondary" size="sm" onClick={() => setMilestoneModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Milestone</span>
              </Button>
            )}
          </div>

          {milestonesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : milestones.length === 0 ? (
            <EmptyState
              title="No milestones defined"
              description="Record deployment phases, regulatory signoffs, or integration targets."
              actionLabel={canManageProject ? 'Add First Milestone' : undefined}
              onAction={() => setMilestoneModalOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => {
                const isCompleted = milestone.status === 'completed';

                return (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestone(milestone)}
                        className={`mt-0.5 sm:mt-0 p-1 rounded-lg transition ${
                          isCompleted
                            ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>

                      <div>
                        <div
                          className={`text-sm font-bold ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {milestone.title}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">
                            Target: {milestone.target_date || 'No target date'}
                          </span>
                          {milestone.completed_at && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                              Completed: {new Date(milestone.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Badge variant={isCompleted ? 'success' : 'warning'} size="sm">
                        {milestone.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Crew & Members */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Assigned Project Crew
            </h2>
            {canManageProject && (
              <Button variant="secondary" size="sm" onClick={() => setMemberModalOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                <span>Assign Crew Member</span>
              </Button>
            )}
          </div>

          {membersLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : members.length === 0 ? (
            <EmptyState
              title="No crew assigned"
              description="Assign field technicians and maintenance leads to this project."
              actionLabel={canManageProject ? 'Assign First Member' : undefined}
              onAction={() => setMemberModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const wf = member.workforce || {};
                const name =
                  wf.name || `${wf.first_name || ''} ${wf.last_name || ''}`.trim() || 'Crew Member';

                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {name[0]}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {member.project_role || 'Technician'}
                        </div>
                      </div>
                    </div>

                    {canManageProject && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Linked Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Project Tasks & Work Items
            </h2>
            <Link to="/tasks">
              <Button variant="secondary" size="sm">
                <span>Open Kanban Board</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks linked to this project"
              description="Create tasks on the Kanban board and associate them with this project code."
              actionLabel="Go to Kanban Board"
              onAction={() => navigate('/tasks')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate('/tasks')}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 hover:shadow-md transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {task.task_code || task.id}
                    </span>
                    <Badge
                      variant={task.column_name === 'completed' ? 'success' : 'primary'}
                      size="sm"
                    >
                      {task.column_name || task.column || 'todo'}
                    </Badge>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                    {task.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Due: {task.due_date || 'None'}</span>
                    <span className="capitalize font-semibold text-slate-600 dark:text-slate-300">
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Milestone Modal */}
      <Modal
        isOpen={milestoneModalOpen}
        onClose={() => setMilestoneModalOpen(false)}
        title="Schedule Project Milestone"
        description="Add a phase delivery milestone, inspection target, or regulatory sign-off."
      >
        <form onSubmit={handleSubmitMilestone(onSubmitMilestone)} className="space-y-4">
          <FormInput
            label="Milestone Title"
            placeholder="e.g. Phase 2: Conveyor Installation & Hydraulic Test"
            {...registerMilestone('title')}
            error={milestoneErrors.title?.message}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              label="Target Completion Date"
              type="date"
              {...registerMilestone('target_date')}
              error={milestoneErrors.target_date?.message}
              required
            />

            <FormSelect
              label="Initial Status"
              {...registerMilestone('status')}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' }
              ]}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setMilestoneModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={addMilestoneMutation.isPending}
              disabled={addMilestoneMutation.isPending}
            >
              Schedule Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Assign Crew Member"
        description="Allocate an active workforce member to this project."
      >
        <form onSubmit={handleSubmitMember(onSubmitMember)} className="space-y-4">
          <FormSelect
            label="Workforce Member"
            {...registerMember('workforce_member_id')}
            options={[
              { value: '', label: 'Select Team Member...' },
              ...employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name || `${emp.first_name} ${emp.last_name}`} (${emp.department || 'Operations'})`
              }))
            ]}
            error={memberErrors.workforce_member_id?.message}
            required
          />

          <FormInput
            label="Project Role Designation"
            placeholder="e.g. Lead Technician, Automation Specialist"
            {...registerMember('project_role')}
            error={memberErrors.project_role?.message}
            required
          />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setMemberModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={addMemberMutation.isPending}
              disabled={addMemberMutation.isPending}
            >
              Assign Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => {
          if (memberToRemove) {
            removeMemberMutation.mutate(memberToRemove.id, {
              onSuccess: () => setMemberToRemove(null)
            });
          }
        }}
        title="Remove Crew Member?"
        message="Are you sure you want to detach this team member from the project roster?"
        confirmLabel="Remove Member"
        variant="danger"
        isLoading={removeMemberMutation.isPending}
      />
    </div>
  );
};

export default ProjectDetailPage;
