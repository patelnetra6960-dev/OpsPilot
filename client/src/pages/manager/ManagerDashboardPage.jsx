import React, { useState } from 'react';
import {
  Users,
  CalendarCheck,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Filter,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Download,
  Activity,
  Layers
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Badge, Button, Modal, Skeleton } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { useWorkforceStatsQuery } from '../../features/workforce/index.js';
import { useManagerAnalyticsQuery, downloadAnalyticsReport } from '../../features/analytics/index.js';

export const ManagerDashboardPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeWorkOrderModal, setActiveWorkOrderModal] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: stats, isLoading: statsLoading } = useWorkforceStatsQuery();
  const { data: managerAnalytics, isLoading: analyticsLoading } = useManagerAnalyticsQuery();

  // Field Technicians Status
  const [technicians] = useState([
    {
      id: 'tech-1',
      name: 'David Kim',
      role: 'Senior Technician',
      status: 'on_site',
      location: 'Metro Distribution Center Bay 4',
      work_order: 'WO-8421 (Hydraulic Lift Inspection)',
      eta: 'On Site since 09:15 AM',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      id: 'tech-2',
      name: 'Emily Davis',
      role: 'Fleet Logistics Specialist',
      status: 'en_route',
      location: 'En route to Apex Cargo Terminal',
      work_order: 'WO-8424 (Cold Chain Sensor Calibration)',
      eta: 'ETA: 15 mins (Traffic Normal)',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    },
    {
      id: 'tech-3',
      name: 'Carlos Mendez',
      role: 'Maintenance Lead',
      status: 'on_break',
      location: 'Acme Central Depot',
      work_order: 'Break scheduled (Meal Period)',
      eta: 'Resuming at 01:30 PM',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    },
    {
      id: 'tech-4',
      name: 'Aisha Patel',
      role: 'Quality & Safety Inspector',
      status: 'on_site',
      location: 'Harbor Gate 12 Warehouse',
      work_order: 'WO-8419 (Safety Protocol Audit)',
      eta: 'On Site since 10:00 AM',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    }
  ]);

  // Timesheets awaiting manager approval
  const [timesheets, setTimesheets] = useState([
    {
      id: 'ts-101',
      employee: 'David Kim',
      date: 'Yesterday (Nov 3)',
      hours: '8.5 hrs',
      overtime: '+0.5 hr OT',
      shift: 'Day Shift (08:00 - 16:30)',
      notes: 'Extended shift to finalize emergency hydraulic pump replacement.'
    },
    {
      id: 'ts-102',
      employee: 'Emily Davis',
      date: 'Yesterday (Nov 3)',
      hours: '9.0 hrs',
      overtime: '+1.0 hr OT',
      shift: 'Day Shift (07:30 - 16:30)',
      notes: 'Highway delay during return dispatch.'
    },
    {
      id: 'ts-103',
      employee: 'Carlos Mendez',
      date: 'Yesterday (Nov 3)',
      hours: '8.0 hrs',
      overtime: 'None',
      shift: 'Standard Shift (08:00 - 16:00)',
      notes: 'Scheduled maintenance completed on schedule.'
    }
  ]);

  const handleApproveTimesheet = (id, name) => {
    setTimesheets(timesheets.filter((t) => t.id !== id));
    dispatch(
      addToast({
        type: 'success',
        title: 'Timesheet Approved',
        message: `Approved timesheet hours for ${name}`
      })
    );
  };

  const handleRejectTimesheet = (id, name) => {
    setTimesheets(timesheets.filter((t) => t.id !== id));
    dispatch(
      addToast({
        type: 'warning',
        title: 'Timesheet Sent for Revision',
        message: `Timesheet for ${name} flagged for correction`
      })
    );
  };

  const handleExportManagerReport = async () => {
    try {
      setIsExporting(true);
      await downloadAnalyticsReport({ type: 'manager' });
      dispatch(
        addToast({
          type: 'success',
          title: 'Manager Report Downloaded',
          message: 'Workload and team productivity CSV report downloaded successfully.'
        })
      );
    } catch {
      dispatch(
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: 'Unable to download manager report.'
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const productivity = managerAnalytics?.productivity || {};
  const workload = managerAnalytics?.workload || [];
  const projects = managerAnalytics?.projects || {};
  const overdueTasks = managerAnalytics?.overdueTasks || { count: 0, items: [] };

  const filteredTechs =
    filterStatus === 'all' ? technicians : technicians.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Users className="w-3 h-3" />
            <span>Operations Management & Productivity Command</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Manager Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Field personnel monitoring, team productivity, employee workload balance, and task velocity
            for {currentTenant?.name || 'Active Organization'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={handleExportManagerReport}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Workload CSV'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveWorkOrderModal(true)}
          >
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
            <span>Assign Field Job</span>
          </Button>
        </div>
      </div>

      {/* Productivity & Task Completion Overview (Prompt 27 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Tasks</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {productivity.totalTasks ?? 0}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Across all agile boards</p>
          </div>
        </Card>

        {/* Task Completion Rate */}
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {productivity.completionRate ?? 0}%
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {productivity.completedTasks ?? 0} tasks resolved
            </p>
          </div>
        </Card>

        {/* In-Progress Tasks */}
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {productivity.inProgressTasks ?? 0}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Actively being worked on</p>
          </div>
        </Card>

        {/* Overdue Tasks Alert */}
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Tasks</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {overdueTasks.count ?? 0}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Past delivery deadline</p>
          </div>
        </Card>

        {/* On-Duty Personnel */}
        <Card variant="elevated" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Team Capacity</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {statsLoading ? <Skeleton className="h-7 w-16" /> : `${stats?.onDuty || 12} Staff`}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Active workforce</p>
          </div>
        </Card>
      </div>

      {/* Employee Workload Table (Prompt 27 Requirement) */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Employee Workload & Task Distribution</span>
            </h2>
            <p className="text-xs text-slate-500">
              Active assignments, task completion metrics, and current workload score per team member.
            </p>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : workload.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No workforce members registered in this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Role & Dept</th>
                  <th className="py-2.5 px-3 text-center">Assigned</th>
                  <th className="py-2.5 px-3 text-center">Active</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3">Workload Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {workload.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                          {emp.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block capitalize">
                        {emp.role}
                      </span>
                      <span className="text-[10px] text-slate-400">{emp.department}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {emp.assignedTasks}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
                        {emp.activeTasks}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold">
                        {emp.completedTasks}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {emp.overdueTasks > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold">
                          {emp.overdueTasks}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 w-44">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Capacity</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {emp.workloadScore}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${emp.workloadScore}%` }}
                            className={`h-full rounded-full ${
                              emp.workloadScore > 80
                                ? 'bg-rose-500'
                                : emp.workloadScore > 50
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Project Status & Overdue Tasks Grid (Prompt 27 Requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Project Status & Health (7 cols) */}
        <div className="lg:col-span-7">
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span>Project Deliverables & Health Status</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Active milestones and progress tracking across organization projects.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Badge variant="primary" size="sm">
                  {projects.byStatus?.in_progress || 0} In Progress
                </Badge>
                <Badge variant="success" size="sm">
                  {projects.byStatus?.completed || 0} Completed
                </Badge>
              </div>
            </div>

            {(!projects.items || projects.items.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No projects found in this organization.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.items.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                          {proj.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{proj.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            proj.health === 'on_track'
                              ? 'success'
                              : proj.health === 'delayed'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {proj.health?.replace('_', ' ') || 'on track'}
                        </Badge>
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {proj.status?.replace('_', ' ') || 'active'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Milestones: {proj.milestonesCompleted} / {proj.milestonesTotal}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {proj.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${proj.progress}%` }}
                          className={`h-full rounded-full ${
                            proj.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Overdue Tasks Queue (5 cols) */}
        <div className="lg:col-span-5">
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Overdue Tasks Attention Queue</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Critical tasks requiring manager escalation or re-allocation.
                </p>
              </div>
              {overdueTasks.count > 0 && (
                <Badge variant="danger" size="sm">
                  {overdueTasks.count} Overdue
                </Badge>
              )}
            </div>

            {overdueTasks.items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-80" />
                <p className="font-medium text-slate-700 dark:text-slate-300">Zero Overdue Tasks</p>
                <p className="text-[11px] text-slate-400">All tasks are currently within scheduled SLAs.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {overdueTasks.items.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px]">
                        {task.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                        {task.daysOverdue}d overdue
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Assignee: <strong className="text-slate-700 dark:text-slate-300">{task.assigneeName}</strong></span>
                      <span className="font-mono text-[10px]">{task.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Live Field Dispatch Board & Status */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Field Dispatch Board</span>
            </h2>
            <p className="text-xs text-slate-500">
              Active technicians on assignment across enterprise sites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              {['all', 'on_site', 'en_route', 'on_break'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                    filterStatus === status
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTechs.map((tech) => (
            <div
              key={tech.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={tech.avatar}
                    alt={tech.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {tech.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{tech.role}</div>
                  </div>
                </div>

                <Badge
                  variant={
                    tech.status === 'on_site'
                      ? 'success'
                      : tech.status === 'en_route'
                      ? 'primary'
                      : 'warning'
                  }
                  size="sm"
                  className="capitalize"
                >
                  {tech.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {tech.work_order}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{tech.location}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">{tech.eta}</span>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(
                      addToast({
                        type: 'info',
                        title: 'Radio Ping Sent',
                        message: `Dispatched status ping to ${tech.name}`
                      })
                    );
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Ping Technician
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Timesheets Review Queue */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Timesheet Approvals</span>
              {timesheets.length > 0 && (
                <Badge variant="warning" size="sm">
                  {timesheets.length} Pending
                </Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Verify logged hours, overtime reasons, and manager approval compliance.
            </p>
          </div>

          {timesheets.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTimesheets([]);
                dispatch(
                  addToast({
                    type: 'success',
                    title: 'Batch Approval Complete',
                    message: 'All pending timesheets approved for payroll export'
                  })
                );
              }}
            >
              Approve All Pending
            </Button>
          )}
        </div>

        {timesheets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              All Timesheets Reviewed
            </div>
            <div className="text-xs text-slate-500">
              No pending approval requests in queue for this tenant.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {timesheets.map((ts) => (
              <div
                key={ts.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {ts.employee}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">• {ts.date}</span>
                    <Badge variant="neutral" size="sm">
                      {ts.shift}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
                    <span>
                      Total Logged: <strong>{ts.hours}</strong>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {ts.overtime}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">{ts.notes}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => handleRejectTimesheet(ts.id, ts.employee)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApproveTimesheet(ts.id, ts.employee)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Approve</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal for Assign Field Job */}
      <Modal
        isOpen={Boolean(activeWorkOrderModal)}
        onClose={() => setActiveWorkOrderModal(false)}
        title="Quick Dispatch Work Order"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActiveWorkOrderModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setActiveWorkOrderModal(false);
                dispatch(
                  addToast({
                    type: 'success',
                    title: 'Work Order Dispatched',
                    message: 'Assigned to David Kim with SMS notification dispatched'
                  })
                );
              }}
            >
              Confirm Dispatch
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Work Order Code & Title
            </label>
            <input
              type="text"
              defaultValue="WO-8495: Express Cargo Loading Bay Inspection"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Field Technician
            </label>
            <select className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option>David Kim (Senior Technician - On Site)</option>
              <option>Emily Davis (Fleet Logistics Specialist)</option>
              <option>Carlos Mendez (Maintenance Lead)</option>
              <option>Aisha Patel (Quality & Safety Inspector)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site Destination
            </label>
            <input
              type="text"
              defaultValue="Acme Logistics Terminal 2, Dock 14"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Priority
            </label>
            <select className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option>Normal (Within 4 hours)</option>
              <option>High Priority (Within 60 mins)</option>
              <option>Critical Emergency (Immediate)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManagerDashboardPage;
