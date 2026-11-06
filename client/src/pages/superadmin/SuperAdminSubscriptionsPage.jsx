import { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Settings,
  Edit2,
  Save,
  Users,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import {
  useSuperAdminSubscriptionsQuery,
  useSuperAdminSubscriptionMetricsQuery,
  useSuperAdminOverrideSubscriptionMutation,
  useSuperAdminUpdatePlanMutation,
  useSubscriptionPlansQuery
} from '../../features/organizations/api/organizationApi.js';

export const SuperAdminSubscriptionsPage = () => {
  const [activeTab, setActiveTab] = useState('organizations'); // 'organizations' | 'plans'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // API Queries
  const { data: subQueryData, isLoading: isSubsLoading } = useSuperAdminSubscriptionsQuery({
    search,
    status: statusFilter || undefined
  });
  const { data: metricsData } = useSuperAdminSubscriptionMetricsQuery();
  const { data: plansData } = useSubscriptionPlansQuery();

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [targetOrgSub, setTargetOrgSub] = useState(null);
  const [overrideTier, setOverrideTier] = useState('starter');
  const [overrideStatus, setOverrideStatus] = useState('active');
  const [overrideCycle, setOverrideCycle] = useState('monthly');
  const [extendDays, setExtendDays] = useState(0);
  const [customMaxMembers, setCustomMaxMembers] = useState('');
  const [customMaxProjects, setCustomMaxProjects] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  const overrideMutation = useSuperAdminOverrideSubscriptionMutation();

  // Edit Plan Modal State
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState(null);
  const [planMonthlyPrice, setPlanMonthlyPrice] = useState(0);
  const [planYearlyPrice, setPlanYearlyPrice] = useState(0);
  const [planMaxMembers, setPlanMaxMembers] = useState(0);
  const [planMaxProjects, setPlanMaxProjects] = useState(0);

  const updatePlanMutation = useSuperAdminUpdatePlanMutation();

  const handleOpenOverrideModal = (sub) => {
    setTargetOrgSub(sub);
    setOverrideTier(sub.tier);
    setOverrideStatus(sub.status);
    setOverrideCycle(sub.billing_cycle || 'monthly');
    setExtendDays(0);
    setCustomMaxMembers(sub.limits?.max_members || '');
    setCustomMaxProjects(sub.limits?.max_projects || '');
    setOverrideNotes('');
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = (e) => {
    e.preventDefault();
    if (!targetOrgSub) return;

    overrideMutation.mutate(
      {
        orgId: targetOrgSub.organization_id,
        tier: overrideTier,
        status: overrideStatus,
        billingCycle: overrideCycle,
        extendTrialDays: extendDays ? Number(extendDays) : undefined,
        customLimits: {
          max_members: customMaxMembers ? Number(customMaxMembers) : undefined,
          max_projects: customMaxProjects ? Number(customMaxProjects) : undefined
        },
        notes: overrideNotes || 'Platform Super Admin manual override'
      },
      {
        onSuccess: () => {
          setIsOverrideModalOpen(false);
        }
      }
    );
  };

  const handleOpenEditPlanModal = (plan) => {
    setSelectedPlanForEdit(plan);
    setPlanMonthlyPrice(plan.price_monthly);
    setPlanYearlyPrice(plan.price_yearly);
    setPlanMaxMembers(plan.limits.max_members);
    setPlanMaxProjects(plan.limits.max_projects);
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlanEdit = (e) => {
    e.preventDefault();
    if (!selectedPlanForEdit) return;

    updatePlanMutation.mutate(
      {
        tier: selectedPlanForEdit.tier,
        updates: {
          price_monthly: Number(planMonthlyPrice),
          price_yearly: Number(planYearlyPrice),
          limits: {
            ...selectedPlanForEdit.limits,
            max_members: Number(planMaxMembers),
            max_projects: Number(planMaxProjects)
          }
        }
      },
      {
        onSuccess: () => {
          setIsEditPlanModalOpen(false);
        }
      }
    );
  };

  const subscriptions = subQueryData?.data || [];

  const columns = [
    {
      key: 'organization_name',
      label: 'Tenant Organization',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {row.organization_id.slice(0, 8)}... • {row.billing_cycle || 'monthly'}
          </div>
        </div>
      )
    },
    {
      key: 'tier',
      label: 'Plan Tier',
      sortable: true,
      render: (val) => (
        <Badge
          variant={val === 'enterprise' ? 'primary' : val === 'growth' ? 'success' : 'neutral'}
          size="sm"
          className="uppercase text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => {
        const isTrial = row.is_trial;
        return (
          <Badge
            variant={
              val === 'active' ? 'success' : isTrial ? 'primary' : val === 'past_due' ? 'error' : 'neutral'
            }
            size="sm"
            className="capitalize text-[10px]"
          >
            {isTrial ? `Trial (${row.days_left_in_trial}d)` : val}
          </Badge>
        );
      }
    },
    {
      key: 'seats',
      label: 'Seat Usage / Limit',
      render: (_val, row) => (
        <span className="font-mono text-xs">
          <strong>{row.usage?.members || 0}</strong> / {row.limits?.max_members || 250}{' '}
          <span className="text-slate-400 text-[10px]">
            ({row.usage?.percentages?.members || 0}%)
          </span>
        </span>
      )
    },
    {
      key: 'mrr',
      label: 'Simulated Rate',
      render: (_val, row) => (
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
          ${row.plan?.price_monthly || 0}/mo
        </span>
      )
    },
    {
      key: 'renewal',
      label: 'Period Renewal',
      render: (_val, row) => (
        <span className="text-[11px] text-slate-500 font-mono">
          {new Date(row.current_period_end).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Super Admin Action',
      render: (_val, row) => (
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => handleOpenOverrideModal(row)}
        >
          <Settings className="w-3 h-3 mr-1" />
          <span>Override</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Platform Subscriptions & Tenant Billing Control
            </h1>
            <Badge variant="primary" size="sm" className="uppercase font-mono text-[10px]">
              Super Admin Console
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SaaS subscription oversight, plan tier pricing configuration, trial extensions, and
            backend usage limit overrides.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('organizations')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'organizations'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tenant Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Plan Catalog & Limits
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Monthly Run Rate</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ${metricsData?.monthly_recurring_revenue?.toLocaleString() || '1,098'}.00
            </div>
            <div className="text-[11px] text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Simulated SaaS MRR</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Tenant Workspaces</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {metricsData?.total_organizations || subscriptions.length} Orgs
            </div>
            <div className="text-[11px] text-slate-400">
              {metricsData?.subscribers_by_tier?.enterprise || 1} Enterprise •{' '}
              {metricsData?.subscribers_by_tier?.growth || 1} Growth
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Trial Workspaces</span>
            <div className="text-2xl font-black text-amber-500 mt-1">
              {metricsData?.subscribers_by_status?.trialing || 1} In Trial
            </div>
            <div className="text-[11px] text-slate-400">14-day evaluation period</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Platform Seat Utilization</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {metricsData?.seat_metrics?.utilization_rate || 24.5}%
            </div>
            <div className="text-[11px] text-slate-400">
              {metricsData?.seat_metrics?.utilized || 36} /{' '}
              {metricsData?.seat_metrics?.capacity || 300} seats
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Tab 1: Organization Subscriptions Table */}
      {activeTab === 'organizations' && (
        <Card variant="default" className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tenant or tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-xl border border-slate-300 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 px-3 py-1.5 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          <Table
            columns={columns}
            data={subscriptions}
            loading={isSubsLoading}
            emptyMessage="No organization subscriptions matching search criteria."
          />
        </Card>
      )}

      {/* Tab 2: Subscription Plans Catalog & Management */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(plansData || []).map((plan) => (
            <Card key={plan.id} variant="default" className="p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg text-slate-900 dark:text-white capitalize">
                    {plan.name}
                  </h3>
                  <Badge variant="primary" size="sm" className="uppercase font-mono text-[10px]">
                    {plan.tier}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500">{plan.description}</p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Monthly Price:</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      ${plan.price_monthly} /mo
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400">Annual Price:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      ${plan.price_yearly} /yr
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                    Default Enforced Limits
                  </span>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1">
                    <span className="text-slate-500">Max Member Seats:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {plan.limits.max_members}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1">
                    <span className="text-slate-500">Max Active Projects:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {plan.limits.max_projects}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1">
                    <span className="text-slate-500">Max Active Tasks:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {plan.limits.max_tasks}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Encrypted Storage:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {plan.limits.storage_gb} GB
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleOpenEditPlanModal(plan)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure Plan Pricing & Limits</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Super Admin Override Modal */}
      {isOverrideModalOpen && targetOrgSub && (
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          title={`Super Admin Subscription Override — ${targetOrgSub.organization_name}`}
        >
          <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <span className="font-bold block">Super Admin Privilege Action</span>
              <span className="text-[11px] block mt-0.5">
                Modifying these settings overrides standard billing rules and customizes resource limits
                directly in the database.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Plan Tier
                </label>
                <Select value={overrideTier} onChange={(e) => setOverrideTier(e.target.value)}>
                  <option value="starter">Starter Plan</option>
                  <option value="growth">Growth Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Status
                </label>
                <Select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                  <option value="active">Active (Paid)</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due (Grace Period)</option>
                  <option value="paused">Paused (Suspended)</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Extend Trial Period
                </label>
                <Select value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))}>
                  <option value={0}>Do not extend</option>
                  <option value={7}>Extend +7 Days</option>
                  <option value={14}>Extend +14 Days</option>
                  <option value={30}>Extend +30 Days</option>
                  <option value={60}>Extend +60 Days</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Interval
                </label>
                <Select value={overrideCycle} onChange={(e) => setOverrideCycle(e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly (Annual)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Custom Resource Limits (Overrides Default Tier Limits)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Custom Max Members / Seats"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={customMaxMembers}
                  onChange={(e) => setCustomMaxMembers(e.target.value)}
                  helperText="Leave empty to use tier default"
                />

                <Input
                  label="Custom Max Projects"
                  type="number"
                  min="1"
                  placeholder="e.g. 2000"
                  value={customMaxProjects}
                  onChange={(e) => setCustomMaxProjects(e.target.value)}
                  helperText="Leave empty to use tier default"
                />
              </div>
            </div>

            <div>
              <Input
                label="Super Admin Audit Notes"
                placeholder="Reason for manual override / executive authorization"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                required
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={overrideMutation.isPending}
                disabled={overrideMutation.isPending}
              >
                Apply Super Admin Override
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Plan Modal */}
      {isEditPlanModalOpen && selectedPlanForEdit && (
        <Modal
          isOpen={isEditPlanModalOpen}
          onClose={() => setIsEditPlanModalOpen(false)}
          title={`Configure Plan Definition — ${selectedPlanForEdit.name}`}
        >
          <form onSubmit={handleSavePlanEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monthly Rate ($ USD)"
                type="number"
                min="0"
                step="0.01"
                value={planMonthlyPrice}
                onChange={(e) => setPlanMonthlyPrice(e.target.value)}
                required
              />
              <Input
                label="Annual Rate ($ USD)"
                type="number"
                min="0"
                step="0.01"
                value={planYearlyPrice}
                onChange={(e) => setPlanYearlyPrice(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Default Max Members"
                type="number"
                min="1"
                value={planMaxMembers}
                onChange={(e) => setPlanMaxMembers(e.target.value)}
                required
              />
              <Input
                label="Default Max Projects"
                type="number"
                min="1"
                value={planMaxProjects}
                onChange={(e) => setPlanMaxProjects(e.target.value)}
                required
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsEditPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updatePlanMutation.isPending}
                disabled={updatePlanMutation.isPending}
              >
                Save Plan Configuration
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SuperAdminSubscriptionsPage;
