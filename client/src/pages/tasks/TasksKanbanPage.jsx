import { useState } from 'react';
import { Activity, Plus, Search, ArrowRight, ArrowLeft, CheckSquare } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Badge, Button, Input, Select, Modal } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_KANBAN_TASKS } from '../../data/prototypeData.js';

export const TasksKanbanPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [tasks, setTasks] = useState(PROTOTYPE_KANBAN_TASKS);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [priority, setPriority] = useState('normal');
  const [assignee, setAssignee] = useState('David Kim');

  const columns = [
    { id: 'todo', label: 'To Do', color: 'bg-amber-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-600' },
    { id: 'review', label: 'Under Review', color: 'bg-purple-600' },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-500' }
  ];

  const moveTask = (taskId, targetColumn) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, column: targetColumn } : t)));

    const targetLabel = columns.find((c) => c.id === targetColumn)?.label || targetColumn;
    dispatch(
      addToast({
        type: 'info',
        title: 'Task Moved',
        message: `${taskId} transitioned to ${targetLabel}`
      })
    );
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask = {
      id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
      title: taskTitle,
      category: category,
      priority: priority,
      column: 'todo',
      dueDate: 'This Week',
      assignedTo: {
        name: assignee,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      projectId: 'PRJ-2026-01',
      commentsCount: 0,
      checklistTotal: 3,
      checklistCompleted: 0
    };

    setTasks([newTask, ...tasks]);
    setModalOpen(false);
    setTaskTitle('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Task Added',
        message: `${newTask.id} added to To-Do board`
      })
    );
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.name.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

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

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search tasks, category, or technician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' }
            ]}
          />
        </div>
      </div>

      {/* 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col, colIdx) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.id);

          return (
            <div
              key={col.id}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {col.label}
                  </span>
                </div>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  {colTasks.length}
                </Badge>
              </div>

              <div className="space-y-3 min-h-[300px]">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No tasks in {col.label.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {task.id}
                        </span>
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'danger'
                              : task.priority === 'high'
                                ? 'warning'
                                : 'neutral'
                          }
                          size="sm"
                          className="capitalize text-[9px]"
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      <div className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                        {task.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                          {task.category}
                        </span>
                        <span className="font-mono text-[10px]">{task.dueDate}</span>
                      </div>

                      {/* Checklist progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            <span>Checklist</span>
                          </span>
                          <span>
                            {task.checklistCompleted}/{task.checklistTotal}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${(task.checklistCompleted / task.checklistTotal) * 100}%`
                            }}
                            className="bg-indigo-600 h-full rounded-full"
                          />
                        </div>
                      </div>

                      {/* Card Footer with Assignee & Move Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={task.assignedTo.avatar}
                            alt={task.assignedTo.name}
                            title={task.assignedTo.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">
                            {task.assignedTo.name.split(' ')[0]}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {colIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, columns[colIdx - 1].id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title={`Move to ${columns[colIdx - 1].label}`}
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {colIdx < columns.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, columns[colIdx + 1].id)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title={`Advance to ${columns[colIdx + 1].label}`}
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Operational Task"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTask}>
              Create Task
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <Input
            label="Task Description"
            placeholder="e.g. Inspect pneumatic valve seal on Conveyor #3"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Task Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Inspection', label: 'Inspection' },
                { value: 'Fleet', label: 'Fleet & Vehicle' },
                { value: 'Compliance', label: 'Compliance & Safety' }
              ]}
            />

            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Assign to Technician
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option>David Kim (Lead Technician)</option>
              <option>Emily Davis (Automation Specialist)</option>
              <option>Carlos Mendez (Maintenance Lead)</option>
              <option>Aisha Patel (Safety Inspector)</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksKanbanPage;
