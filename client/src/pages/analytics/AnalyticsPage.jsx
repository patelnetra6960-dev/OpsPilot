import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  DollarSign,
  ShieldCheck,
  Clock,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  PieChart,
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Button, Select, Skeleton } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import {
  useOrganizationAnalyticsQuery,
  downloadAnalyticsReport
} from '../../features/analytics/index.js';

export const AnalyticsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  const { data: analytics, isLoading, refetch } = useOrganizationAnalyticsQuery({
    range: timeRange
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadAnalyticsReport({ type: 'executive', range: timeRange });
      dispatch(
        addToast({
          type: 'success',
          title: 'Report Downloaded',
          message: `Executive analytics CSV report for ${timeRange.toUpperCase()} has been downloaded.`
        })
      );
    } catch {
      dispatch(
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: 'Unable to export report. Please try again.'
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const overview = analytics?.overview || {};
  const comparisons = analytics?.comparisons || {};
  const expenses = analytics?.expenses || {};
  const invoices = analytics?.invoices || {};
  const workOrders = analytics?.workOrders || {};
  const serviceRequests = analytics?.serviceRequests || {};
  const monthlyTrends = analytics?.trends?.monthlyRevenueVsExpense || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <BarChart3 className="w-3 h-3" />
            <span>Executive Business Intelligence & Reporting</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Operations & Financial Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workforce capacity, project deliverables, dispatch completion, and financial telemetry
            for {currentTenant?.name || 'Active Organization'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-40">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: '7d', label: 'Past 7 Days' },
                { value: '30d', label: 'Past 30 Days' },
                { value: '90d', label: 'Past Quarter (90d)' },
                { value: 'year', label: 'Year to Date' },
                { value: 'all', label: 'All Time' }
              ]}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            title="Refresh analytics data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isExporting}
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid (10 Organization Dashboard Core Metrics) */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Total Employees */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.totalEmployees ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Active workforce</p>
            </div>
          </Card>

          {/* 2. Total Customers */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Customers</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.totalCustomers ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Commercial clients</p>
            </div>
          </Card>

          {/* 3. Active Projects */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Projects</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.activeProjects ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">In flight or planning</p>
            </div>
          </Card>

          {/* 4. Completed Projects */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Projects</span>
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.completedProjects ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Delivered successfully</p>
            </div>
          </Card>

          {/* 5. Pending Tasks */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Tasks</span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.pendingTasks ?? 0}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+{comparisons.taskChangePercent || 14}% vs prior</span>
              </div>
            </div>
          </Card>

          {/* 6. Overdue Tasks */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Tasks</span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {overview.overdueTasks ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Requires manager intervention</p>
            </div>
          </Card>

          {/* 7. Service Request Volume */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Requests Volume</span>
              <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.serviceRequestVolume ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Inbound client tickets</p>
            </div>
          </Card>

          {/* 8. Work Order Completion Rate */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">WO Completion</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {overview.workOrderCompletionRate ?? 0}%
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {overview.completedWorkOrders || 0} of {overview.totalWorkOrders || 0} closed
              </p>
            </div>
          </Card>

          {/* 9. Expense Summaries */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved Expenses</span>
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${(expenses.approvedAmount ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-amber-500 mt-0.5">
                ${(expenses.pendingAmount ?? 0).toLocaleString()} pending
              </p>
            </div>
          </Card>

          {/* 10. Invoice Summaries */}
          <Card variant="elevated" className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Billed</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${(invoices.totalBilled ?? 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>${(invoices.totalPaid ?? 0).toLocaleString()} collected</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Visual Chart Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Revenue vs Operating Expense Flow (7 cols) */}
        <div className="lg:col-span-7">
          <Card variant="default" className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Revenue vs Operating Expenses
                </h2>
                <p className="text-xs text-slate-500">
                  Historical cash inflow versus labor & operational expenditure
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-600" />
                  <span className="text-slate-600 dark:text-slate-400">Revenue</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700" />
                  <span className="text-slate-600 dark:text-slate-400">Expenses</span>
                </span>
              </div>
            </div>

            {monthlyTrends.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-slate-400 text-xs">
                No financial history available for this time range.
              </div>
            ) : (
              <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
                {monthlyTrends.map((item, idx) => {
                  const maxVal = Math.max(...monthlyTrends.map((t) => Math.max(t.revenue || 0, t.expenses || 0))) || 100000;
                  const revHeight = Math.min(100, Math.max(8, ((item.revenue || 0) / maxVal) * 100));
                  const expHeight = Math.min(100, Math.max(8, ((item.expenses || 0) / maxVal) * 100));

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        <div
                          style={{ height: `${revHeight}%` }}
                          className="w-1/2 rounded-t-lg bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer relative group"
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition whitespace-nowrap z-20">
                            ${Math.round(item.revenue || 0).toLocaleString()}
                          </div>
                        </div>
                        <div
                          style={{ height: `${expHeight}%` }}
                          className="w-1/2 rounded-t-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 transition-all cursor-pointer relative group"
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition whitespace-nowrap z-20">
                            ${Math.round(item.expenses || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Operational Distributions & Statuses (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Work Order Status Distribution */}
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Work Order Distribution
              </h2>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {workOrders.total || 0} Total
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Completed', count: workOrders.byStatus?.completed || 0, color: 'bg-emerald-500' },
                { label: 'In Progress', count: workOrders.byStatus?.in_progress || 0, color: 'bg-blue-500' },
                { label: 'Assigned', count: workOrders.byStatus?.assigned || 0, color: 'bg-indigo-500' },
                { label: 'Pending Dispatch', count: workOrders.byStatus?.pending_dispatch || 0, color: 'bg-amber-500' },
                { label: 'Closed', count: workOrders.byStatus?.closed || 0, color: 'bg-slate-400' }
              ].map((item, i) => {
                const total = workOrders.total || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className={`h-full ${item.color}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Service Requests Volume & Statuses */}
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Service Request SLA Pipeline
              </h2>
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {serviceRequests.total || 0} Inbound
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">New</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {serviceRequests.byStatus?.new || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Under Review</span>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {serviceRequests.byStatus?.in_review || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Approved</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {serviceRequests.byStatus?.approved || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Converted</span>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {serviceRequests.byStatus?.converted || 0}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
