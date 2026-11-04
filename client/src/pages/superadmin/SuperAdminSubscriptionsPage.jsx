import { CreditCard, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card, Badge, Table } from '../../components/ui/index.js';

export const SuperAdminSubscriptionsPage = () => {
  const subscriptions = [
    {
      org: 'Acme Logistics Global',
      plan: 'Enterprise',
      amount: '$799/mo',
      billing: 'Annual (Stripe)',
      seats: '84 / 100',
      status: 'active',
      renew: '2027-01-15'
    },
    {
      org: 'Apex Field Services',
      plan: 'Growth',
      amount: '$299/mo',
      billing: 'Monthly (Stripe)',
      seats: '36 / 50',
      status: 'active',
      renew: '2026-12-10'
    },
    {
      org: 'Metro Haulage & Freight',
      plan: 'Starter',
      amount: '$99/mo',
      billing: 'Monthly (Stripe)',
      seats: '12 / 15',
      status: 'active',
      renew: '2026-12-01'
    },
    {
      org: 'Vanguard Industrial Ops',
      plan: 'Enterprise',
      amount: '$799/mo',
      billing: 'Annual (Stripe)',
      seats: '120 / 150',
      status: 'active',
      renew: '2027-03-12'
    }
  ];

  const columns = [
    {
      key: 'org',
      label: 'Tenant Organization',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.billing}</div>
        </div>
      )
    },
    {
      key: 'plan',
      label: 'Plan Tier',
      sortable: true,
      render: (val) => (
        <Badge
          variant={val === 'Enterprise' ? 'primary' : val === 'Growth' ? 'success' : 'neutral'}
          size="sm"
          className="uppercase text-[10px]"
        >
          {val}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Monthly Rate',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{val}</span>
      )
    },
    {
      key: 'seats',
      label: 'Seat Usage',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    {
      key: 'renew',
      label: 'Renewal Date',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant="success" size="sm" className="capitalize text-[10px]">
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Platform Subscriptions & Billing Oversight
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Global SaaS revenue, plan tiers, and Stripe recurring subscription cycles across all
          tenants.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Platform MRR</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              $1,996.00 / mo
            </div>
            <div className="text-[11px] text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% month-over-month</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Paid Tenants</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              4 Organizations
            </div>
            <div className="text-[11px] text-slate-400">0 delinquent accounts</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="elevated" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Average Contract Value</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              $5,988.00 / yr
            </div>
            <div className="text-[11px] text-slate-400">Enterprise tier dominant</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <Card variant="default" className="p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Tenant Plans</h2>
        <Table columns={columns} data={subscriptions} emptyMessage="No active subscriptions." />
      </Card>
    </div>
  );
};

export default SuperAdminSubscriptionsPage;
