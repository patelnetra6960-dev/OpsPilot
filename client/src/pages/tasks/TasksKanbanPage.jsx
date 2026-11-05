import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity,
  Plus,
  Search,
  LayoutGrid,
  List,
  User,
  Users,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  Edit,
  UploadCloud
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useTransitionTaskStatusMutation,
  useDeleteTaskMutation,
  useTaskAssignmentsQuery,
  useAssignTaskMutation,
  useTaskCommentsQuery,
  useAddTaskCommentMutation,
  useTaskAttachmentsQuery,
  useAddTaskAttachmentMutation,
  taskCreateSchema,
  taskUpdateSchema,
  taskCommentSchema,
  taskAttachmentSchema
} from '../../features/tasks/index.js';
import { useProjectsQuery } from '../../features/projects/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';
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

const COLUMNS = [
  { id: 'todo', label: 'To Do', border: 'border-amber-400', badge: 'warning' },
  { id: 'in_progress', label: 'In Progress', border: 'border-indigo-500', badge: 'brand' },
  { id: 'review', label: 'Under Review', border: 'border-purple-500', badge: 'primary' },
  { id: 'completed', label: 'Completed', border: 'border-emerald-500', badge: 'success' }
];

export const TasksKanbanPage = () => {
  const { currentTenant } = useTenant();
  const { isOwner, isAdmin, isManager } = useAuth();

  // View state: 'kanban' | 'list'
  const [viewMode, setViewMode] = useState('kanban');

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination for list view
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drag and Drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modals & Drawer state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Queries
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      project_id: projectFilter !== 'all' ? projectFilter : undefined
    }),
    [debouncedSearch, priorityFilter, categoryFilter, projectFilter]
  );

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useTasksQuery(queryFilters);

  const { data: projects = [] } = useProjectsQuery();
  const { data: employees = [] } = useEmployeesQuery();

  // Detail Queries (active when a task is selected)
  const { data: taskComments = [] } = useTaskCommentsQuery(selectedTask?.id, {
    enabled: Boolean(selectedTask?.id)
  });
  const { data: taskAttachments = [] } = useTaskAttachmentsQuery(selectedTask?.id, {
    enabled: Boolean(selectedTask?.id)
  });
  const { data: taskAssignments = [] } = useTaskAssignmentsQuery(selectedTask?.id, {
    enabled: Boolean(selectedTask?.id)
  });

  // Mutations
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation(selectedTask?.id);
  const transitionStatusMutation = useTransitionTaskStatusMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const assignTaskMutation = useAssignTaskMutation(selectedTask?.id);
  const addCommentMutation = useAddTaskCommentMutation(selectedTask?.id);
  const addAttachmentMutation = useAddTaskAttachmentMutation(selectedTask?.id);

  // Create Task Form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors }
  } = useForm({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Maintenance',
      priority: 'normal',
      column_name: 'todo',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      project_id: '',
      assigned_to: '',
      checklist_total: 3,
      checklist_completed: 0
    }
  });

  // Edit Task Form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors }
  } = useForm({
    resolver: zodResolver(taskUpdateSchema)
  });

  // Comment Form
  const {
    register: registerComment,
    handleSubmit: handleSubmitComment,
    reset: resetComment
  } = useForm({
    resolver: zodResolver(taskCommentSchema)
  });

  // Attachment Form
  const {
    register: registerAttachment,
    handleSubmit: handleSubmitAttachment,
    reset: resetAttachment
  } = useForm({
    resolver: zodResolver(taskAttachmentSchema),
    defaultValues: {
      file_name: '',
      file_url: 'https://storage.opspilot.io/docs/inspection-sample.pdf',
      file_size: 2048,
      mime_type: 'application/pdf'
    }
  });

  // Handlers
  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setEditValue('title', task.title);
    setEditValue('description', task.description || '');
    setEditValue('category', task.category || 'Maintenance');
    setEditValue('priority', task.priority || 'normal');
    setEditValue('column_name', task.column_name || task.column || 'todo');
    setEditValue('due_date', task.due_date || '');
    setEditValue('project_id', task.project_id || '');
    setEditValue('assigned_to', task.assigned_to || '');
    setEditModalOpen(true);
  };

  const onSubmitCreate = (data) => {
    createTaskMutation.mutate(data, {
      onSuccess: () => {
        setCreateModalOpen(false);
        resetCreate();
      }
    });
  };

  const onSubmitEdit = (data) => {
    if (!selectedTask) return;
    updateTaskMutation.mutate(data, {
      onSuccess: (updated) => {
        setSelectedTask(updated);
        setEditModalOpen(false);
        resetEdit();
      }
    });
  };

  const onSubmitComment = (data) => {
    if (!selectedTask) return;
    addCommentMutation.mutate(data, {
      onSuccess: () => {
        resetComment();
      }
    });
  };

  const onSubmitAttachment = (data) => {
    if (!selectedTask) return;
    addAttachmentMutation.mutate(data, {
      onSuccess: () => {
        setAttachmentModalOpen(false);
        resetAttachment();
      }
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);

    if (taskId && targetColumn) {
      transitionStatusMutation.mutate({
        taskId,
        columnName: targetColumn
      });
    }
  };

  // Tasks grouped by column
  const tasksByColumn = useMemo(() => {
    const grouped = {
      todo: [],
      in_progress: [],
      review: [],
      completed: []
    };

    (tasks || []).forEach((t) => {
      const col = t.column_name || t.column || 'todo';
      if (grouped[col]) {
        grouped[col].push(t);
      } else {
        grouped.todo.push(t);
      }
    });

    return grouped;
  }, [tasks]);

  // Pagination for list view
  const paginatedTasks = useMemo(() => {
    const list = tasks || [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [tasks, page, pageSize]);

  const totalPages = Math.ceil((tasks || []).length / pageSize) || 1;

  const canManageTasks = isOwner || isAdmin || isManager;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Activity className="w-3 h-3" />
            <span>Operational Tasks & Agile Kanban</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Task Management & Kanban Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Field maintenance checklists, compliance verification, and crew assignments for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search task title, code, crew..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inspection">Inspection</option>
            <option value="Compliance">Compliance</option>
            <option value="Fleet">Fleet Operations</option>
            <option value="Safety">Safety Protocol</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none truncate"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code || p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Board / View */}
      {tasksLoading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : tasksError ? (
        <ErrorState
          message={tasksError.apiMessage || 'Could not load tasks.'}
          onRetry={refetchTasks}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks match your criteria"
          description="Adjust your search filters or create an operational maintenance task."
          actionLabel="Create Task"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByColumn[column.id] || [];
            const isDropTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`rounded-3xl border bg-slate-100/60 dark:bg-slate-900/60 p-4 transition-all duration-200 min-h-[550px] flex flex-col gap-3 ${
                  isDropTarget
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${column.border} bg-current`} />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {column.label}
                    </h3>
                  </div>
                  <Badge variant={column.badge} size="sm">
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3">
                  {columnTasks.map((task) => {
                    const isDragging = draggingTaskId === task.id;
                    const priorityVariant =
                      task.priority === 'urgent'
                        ? 'danger'
                        : task.priority === 'high'
                          ? 'warning'
                          : task.priority === 'low'
                            ? 'secondary'
                            : 'primary';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTask(task)}
                        className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-indigo-500/50 transition cursor-grab active:cursor-grabbing space-y-3 ${
                          isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {task.task_code || task.id}
                          </span>
                          <Badge variant={priorityVariant} size="sm" dot>
                            {task.priority}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                            {task.category || 'Maintenance'}
                          </span>

                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{task.due_date || 'No Date'}</span>
                          </div>
                        </div>

                        {/* Interactive summary metadata */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {task.checklist_completed || 0}/{task.checklist_total || 0}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {Boolean(task.commentsCount || task.comments_count) && (
                              <div className="flex items-center gap-0.5">
                                <MessageSquare className="w-3 h-3" />
                                <span>{task.commentsCount || task.comments_count}</span>
                              </div>
                            )}

                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[9px] uppercase">
                              {(task.assignedTo?.name || task.assigned_to || 'U')[0]}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / PAGINATED LIST VIEW */
        <div className="space-y-4">
          <div className="w-full overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Task Code & Title</th>
                  <th className="py-3.5 px-4">Status Column</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Checklist</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedTasks.map((task) => {
                  const priorityVariant =
                    task.priority === 'urgent'
                      ? 'danger'
                      : task.priority === 'high'
                        ? 'warning'
                        : task.priority === 'low'
                          ? 'secondary'
                          : 'primary';

                  const col = COLUMNS.find((c) => c.id === (task.column_name || task.column));

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {task.task_code || task.id}
                          </span>
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {task.title}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={col?.badge || 'primary'} size="sm">
                          {col?.label || task.column_name || task.column}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={priorityVariant} size="sm" dot>
                          {task.priority}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">{task.category || 'General'}</td>

                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {task.due_date || 'No Date'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs">
                          {task.checklist_completed || 0}/{task.checklist_total || 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(task);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 font-semibold text-[11px]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>records per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Drawer with Status Transition, Assignments, Comments, Attachments */}
      <Drawer
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.task_code || 'Task Specification'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(selectedTask)}>
                <Edit className="w-3.5 h-3.5 mr-1" />
                <span>Edit Task</span>
              </Button>
              {canManageTasks && (
                <Button variant="danger" size="sm" onClick={() => setTaskToDelete(selectedTask)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Archive</span>
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Title & Status Transition Header */}
            <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedTask.task_code || selectedTask.id}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Board Status:</span>
                  <select
                    value={selectedTask.column_name || selectedTask.column || 'todo'}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      transitionStatusMutation.mutate(
                        { taskId: selectedTask.id, columnName: newCol },
                        {
                          onSuccess: (updated) => {
                            setSelectedTask({ ...selectedTask, ...updated });
                          }
                        }
                      );
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 capitalize"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Under Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {selectedTask.title}
              </h2>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedTask.description || 'No detailed instructions provided.'}
              </p>
            </div>

            {/* Task Meta Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850">
              <div>
                <span className="text-slate-400 text-[10px] block">Priority</span>
                <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Category</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTask.category || 'Maintenance'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Due Date</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedTask.due_date || 'No Date'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Checklist Items</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedTask.checklist_completed || 0}/{selectedTask.checklist_total || 0} Done
                </span>
              </div>
            </div>

            {/* Crew Assignments Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assigned Crew Members</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => setAssignModalOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Assign Member</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {taskAssignments.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">
                    No crew members assigned yet.
                  </span>
                ) : (
                  taskAssignments.map((a) => {
                    const wf = a.workforce || {};
                    const name =
                      wf.name ||
                      `${wf.first_name || ''} ${wf.last_name || ''}`.trim() ||
                      'Crew Member';
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <User className="w-3 h-3 text-indigo-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments ({taskAttachments.length})</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => setAttachmentModalOpen(true)}>
                  <UploadCloud className="w-3 h-3 mr-1" />
                  <span>Add File</span>
                </Button>
              </div>

              <div className="space-y-2">
                {taskAttachments.length === 0 ? (
                  <span className="text-slate-400 text-xs italic">
                    No files or field photos attached.
                  </span>
                ) : (
                  taskAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {att.file_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                        {Math.round((att.file_size || 1024) / 1024)} KB
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comments & Discussion Thread */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion Thread ({taskComments.length})</span>
              </span>

              {/* Add comment box */}
              <form onSubmit={handleSubmitComment(onSubmitComment)} className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Post an update, inspection note, or safety query..."
                  {...registerComment('comment_text')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    loading={addCommentMutation.isPending}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    <span>Send Note</span>
                  </Button>
                </div>
              </form>

              {/* Comment list */}
              <div className="space-y-2.5 pt-2">
                {taskComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {comment.author?.full_name || 'Crew Member'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {comment.created_at
                          ? new Date(comment.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Just now'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{comment.comment_text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal: Create Task */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Operational Task"
        description="Add a maintenance item, inspection checklist, or field activity to the Kanban board."
      >
        <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-4">
          <FormInput
            label="Task Title"
            placeholder="e.g. Inspect hydraulic lift valve pressure"
            {...registerCreate('title')}
            error={createErrors.title?.message}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormSelect
              label="Priority Level"
              {...registerCreate('priority')}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' }
              ]}
            />

            <FormSelect
              label="Category"
              {...registerCreate('category')}
              options={[
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Inspection', label: 'Inspection' },
                { value: 'Compliance', label: 'Compliance' },
                { value: 'Fleet', label: 'Fleet Operations' },
                { value: 'Safety', label: 'Safety Protocol' }
              ]}
            />

            <FormInput
              label="Due Date"
              type="date"
              {...registerCreate('due_date')}
              error={createErrors.due_date?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormSelect
              label="Linked Project"
              {...registerCreate('project_id')}
              options={[
                { value: '', label: 'None (Standalone Task)' },
                ...projects.map((p) => ({
                  value: p.id,
                  label: `${p.project_code || p.id} - ${p.name}`
                }))
              ]}
            />

            <FormSelect
              label="Primary Assignee"
              {...registerCreate('assigned_to')}
              options={[
                { value: '', label: 'Unassigned' },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.name || `${e.first_name} ${e.last_name}`} (${e.department || 'Crew'})`
                }))
              ]}
            />
          </div>

          <FormTextarea
            label="Technical Instructions / Description"
            rows={3}
            placeholder="Detailed procedure, valve specs, or safety guidelines..."
            {...registerCreate('description')}
          />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={createTaskMutation.isPending}
              disabled={createTaskMutation.isPending}
            >
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Task */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Task Specification"
        description="Modify attributes, due dates, or reassign operational items."
      >
        <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
          <FormInput
            label="Task Title"
            {...registerEdit('title')}
            error={editErrors.title?.message}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormSelect
              label="Priority"
              {...registerEdit('priority')}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' }
              ]}
            />

            <FormSelect
              label="Status Column"
              {...registerEdit('column_name')}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'Under Review' },
                { value: 'completed', label: 'Completed' }
              ]}
            />

            <FormInput label="Due Date" type="date" {...registerEdit('due_date')} />
          </div>

          <FormTextarea label="Description" rows={3} {...registerEdit('description')} />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={updateTaskMutation.isPending}
              disabled={updateTaskMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Crew Member */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Crew Member to Task"
        description="Allocate an active workforce technician to this work item."
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Crew Member
            </label>
            <select
              id="crew-select"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || `${emp.first_name} ${emp.last_name}`} —{' '}
                  {emp.designation || 'Technician'}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={assignTaskMutation.isPending}
              onClick={() => {
                const select = document.getElementById('crew-select');
                if (select && select.value) {
                  assignTaskMutation.mutate(select.value, {
                    onSuccess: () => setAssignModalOpen(false)
                  });
                }
              }}
            >
              Assign Crew Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Attachment */}
      <Modal
        isOpen={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
        title="Add Task Attachment"
        description="Attach an inspection report, field photo, or compliance document."
      >
        <form onSubmit={handleSubmitAttachment(onSubmitAttachment)} className="space-y-4">
          <FormInput
            label="Document / Photo Name"
            placeholder="e.g. Hydraulic_Seal_Inspection.pdf"
            {...registerAttachment('file_name')}
            required
          />

          <FormInput
            label="File Storage URL or Reference"
            placeholder="https://..."
            {...registerAttachment('file_url')}
            required
          />

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setAttachmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={addAttachmentMutation.isPending}
            >
              Attach File
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete.id, {
              onSuccess: () => {
                setTaskToDelete(null);
                setSelectedTask(null);
              }
            });
          }
        }}
        title="Archive Task?"
        message="Are you sure you want to remove this task from the operational board?"
        confirmLabel="Archive Task"
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};

export default TasksKanbanPage;
