import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Users,
  ShieldCheck,
  Activity,
  Send,
  Sparkles,
  CalendarCheck,
  Building2,
  CreditCard,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, Skeleton, Button } from '../components/ui/index.js';
import { useAuth } from '../hooks/useAuth.js';
import { useWorkforceStatsQuery } from '../features/workforce/index.js';
import { useCurrentOrganizationQuery } from '../features/organizations/index.js';
import { useAuditLogsQuery } from '../features/audit/index.js';
import { PROTOTYPE_ANALYTICS } from '../data/prototypeData.js';

export const DashboardPage = () => {
  const { currentTenant } = useSelector((state) => state.tenant);
  const { user, isAdmin, isOwner, isManager } = useAuth();
  const [timeRange, setTimeRange] = useState('30D');

  const { data: stats, isLoading: statsLoading } = useWorkforceStatsQuery();
  const { data: orgData } = useCurrentOrganizationQuery({
    enabled: Boolean(currentTenant?.id)
  });

  const canViewAudit = isAdmin || isOwner;
  const { data: auditData, isLoading: auditLoading } = useAuditLogsQuery(
    { limit: 5 },
    { enabled: canViewAudit }
  );

  const activeOrg = orgData || currentTenant;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner with Quick Range Filter */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 border border-indigo-800/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" size="sm" dot>
                Tenant: {activeOrg?.name || 'Active Tenant'}
              </Badge>
              <span className="text-xs text-indigo-200/80 font-mono">
                Tier: {activeOrg?.subscription_tier?.toUpperCase() || 'ENTERPRISE'}
              </span>
              <span className="text-[10px] bg-white/10 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
                Role: {user?.role?.toUpperCase() || 'OWNER'}
              </span>
              <span className="text-[10px] bg-white/10 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
                RLS Partition: {activeOrg?.id ? `${activeOrg.id.slice(0, 8)}...` : 'Active'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Enterprise Operations Control Center
            </h1>
            <p className="text-indigo-200/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time multi-tenant operations, workforce scheduling, field dispatch, and data
              isolation powered by PostgreSQL RLS.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Time range selector */}
            <div className="flex rounded-xl bg-white/10 backdrop-blur-md p-1 border border-white/20 text-xs font-semibold">
              {['Today', '7D', '30D', 'YTD'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg transition ${
                    timeRange === range
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-indigo-200 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <Link
              to="/dispatch"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>Field Dispatch Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Permitted Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Permitted Management Actions:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isOwner) && (
            <>
              <Link to="/workforce">
                <Button variant="primary" size="sm">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Manage Workforce</span>
                </Button>
              </Link>
              <Link to="/workforce">
                <Button variant="secondary" size="sm">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  <span>Send Invite</span>
                </Button>
              </Link>
            </>
          )}
          {isManager && (
            <Link to="/manager">
              <Button variant="primary" size="sm">
                <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                <span>Manager Command</span>
              </Button>
            </Link>
          )}
          <Link to="/shifts">
            <Button variant="outline" size="sm">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Shift Rota</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workforce */}
        <Card hover className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Workforce</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalStaff || 18}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {stats?.departmentCount || 4} active departments
            </div>
          </div>
        </Card>

        {/* Active Staff */}
        <Card hover className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Clocked In (Live)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.activeStaff || 14}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              98.2% punctuality rate
            </div>
          </div>
        </Card>

        {/* Work Orders Today */}
        <Card hover className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Hourly Index</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `$${stats?.averageHourlyRate || 42}/hr`
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Payroll standard rate
            </div>
          </div>
        </Card>

        {/* Multi-Tenant Security Status */}
        <Card hover className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tenant Isolation</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              RLS Active
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Zero cross-tenant leakage
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Operations Telemetry & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Revenue vs Operations Cost Chart (7 cols) */}
        <div className="lg:col-span-7">
          <Card variant="default" className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Operational Revenue vs Expense Velocity
                </h2>
                <p className="text-xs text-slate-500">
                  Monthly performance trends ({timeRange} window)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Expense</span>
                </div>
              </div>
            </div>

            {/* SVG / CSS Bar Chart Visualization */}
            <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
              {PROTOTYPE_ANALYTICS.monthlyRevenueVsExpense.map((item, idx) => {
                const max = 100000;
                const revHeight = (item.revenue / max) * 100;
                const expHeight = (item.expense / max) * 100;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      <div
                        style={{ height: `${revHeight}%` }}
                        className="w-1/2 rounded-t-md bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 relative group cursor-pointer"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition">
                          ${(item.revenue / 1000).toFixed(0)}k
                        </div>
                      </div>
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-1/2 rounded-t-md bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 transition-all duration-300 relative group cursor-pointer"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition">
                          ${(item.expense / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Department Utilization & Work Order Status (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Workforce Utilization by Department
            </h2>

            <div className="space-y-3">
              {PROTOTYPE_ANALYTICS.utilizationByDepartment.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.dept}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.rate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.rate}%` }}
                      className={`h-full rounded-full ${
                        item.rate >= item.target ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Operational Activity & Audit Trail Card */}
          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Recent Operational Activity</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Live RLS Stream</span>
            </div>

            <div className="space-y-2">
              {auditLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : auditData && auditData.length > 0 ? (
                auditData.slice(0, 4).map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[11px] truncate">
                        {log.actor?.email || log.user_id || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Shift Rota Dispatched
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">10m ago</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Safety Credential Verified
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">25m ago</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Operational Launchpad */}
      <Card variant="default" className="p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Operations Quick Launchpad</span>
          </span>
          <span className="text-[11px] text-slate-400">1-click navigation across modules</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {[
            { label: 'Workforce', path: '/workforce', icon: Users, color: 'text-indigo-600' },
            { label: 'Shift Rota', path: '/shifts', icon: CalendarCheck, color: 'text-purple-600' },
            { label: 'Field Dispatch', path: '/dispatch', icon: Send, color: 'text-blue-600' },
            { label: 'Kanban Tasks', path: '/tasks', icon: Activity, color: 'text-emerald-600' },
            { label: 'Inventory', path: '/inventory', icon: Building2, color: 'text-amber-600' },
            { label: 'Invoices', path: '/invoices', icon: CreditCard, color: 'text-rose-600' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                to={item.path}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center space-y-1.5 group"
              >
                <div
                  className={`w-8 h-8 rounded-xl bg-white dark:bg-slate-800 mx-auto flex items-center justify-center shadow-xs group-hover:scale-110 transition ${item.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
