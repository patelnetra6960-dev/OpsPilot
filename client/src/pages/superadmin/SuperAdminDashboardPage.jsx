import { useState } from 'react';
import {
  Building2,
  Users,
  Activity,
  DollarSign,
  Plus,
  Search,
  ShieldCheck,
  Server,
  RefreshCw
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Tenant Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTier, setNewTier] = useState('growth');
  const [adminEmail, setAdminEmail] = useState('');

  const [tenants, setTenants] = useState([
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      tier: 'enterprise',
      status: 'active',
      users_count: 84,
      storage_mb: 4820,
      created_at: '2026-01-15'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Apex Field Services',
      slug: 'apex-field-services',
      tier: 'growth',
      status: 'active',
      users_count: 36,
      storage_mb: 1420,
      created_at: '2026-02-10'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Metro Haulage & Freight',
      slug: 'metro-haulage',
      tier: 'starter',
      status: 'active',
      users_count: 12,
      storage_mb: 310,
      created_at: '2026-03-01'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Vanguard Industrial Ops',
      slug: 'vanguard-ops',
      tier: 'enterprise',
      status: 'active',
      users_count: 120,
      storage_mb: 9240,
      created_at: '2026-03-12'
    }
  ]);

  const handleCreateTenant = (e) => {
    e.preventDefault();
    if (!newOrgName || !newSlug) return;

    const newTenant = {
      id: `org-${Date.now()}`,
      name: newOrgName,
      slug: newSlug,
      tier: newTier,
      status: 'active',
      users_count: 1,
      storage_mb: 25,
      created_at: new Date().toISOString().split('T')[0]
    };

    setTenants([newTenant, ...tenants]);
    setModalOpen(false);
    setNewOrgName('');
    setNewSlug('');
    setAdminEmail('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Tenant Provisioned',
        message: `${newTenant.name} partition initialized with isolated RLS`
      })
    );
  };

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === 'all' || t.tier === filterTier;
    return matchSearch && matchTier;
  });

  const columns = [
    {
      key: 'name',
      label: 'Organization / Tenant',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            {val.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs">{val}</div>
            <div className="text-[10px] text-slate-400 font-mono">{row.slug}</div>
          </div>
        </div>
      )
    },
    {
      key: 'tier',
      label: 'Subscription',
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
      key: 'users_count',
      label: 'Active Users',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val} members</span>
    },
    {
      key: 'storage_mb',
      label: 'Vault Usage',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{(val / 1024).toFixed(1)} GB</span>
    },
    {
      key: 'status',
      label: 'RLS Status',
      render: () => (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Enforced</span>
        </div>
      )
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Tenant Inspected',
                message: `Inspecting partition metrics for ${row.name}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          Manage
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Platform Master Governance</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Global multi-tenant infrastructure, tenant provisioning, and platform health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh Telemetry</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Provision Tenant</span>
          </Button>
        </div>
      </div>

      {/* Global Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Active Tenants',
            value: tenants.length,
            sub: '+2 this month',
            icon: Building2,
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
          },
          {
            title: 'Global Platform Users',
            value: '252',
            sub: 'Across all active orgs',
            icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
          },
          {
            title: 'Platform MRR',
            value: '$12,480',
            sub: '100% collected on Stripe',
            icon: DollarSign,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
          },
          {
            title: 'System Health',
            value: '99.99%',
            sub: '28ms API average latency',
            icon: Activity,
            color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60'
          }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} variant="elevated" className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {kpi.title}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</div>
              </div>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${kpi.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Platform Telemetry Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="default" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>Database Connection Pool</span>
            </span>
            <Badge variant="success" size="sm">
              Healthy
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Pool Utilization:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                18 / 60 Conn
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[30%]" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            PostgreSQL 15+ RDS instance running with zero deadlocks.
          </div>
        </Card>

        <Card variant="default" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>RLS Security Auditing</span>
            </span>
            <Badge variant="success" size="sm">
              100% Verified
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            All 6 multi-tenant tables enforce{' '}
            <code className="font-mono text-indigo-500">is_member_of(org_id)</code>. 0 leakages
            recorded in audit logs.
          </p>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Universal soft-delete policy active.
          </div>
        </Card>

        <Card variant="default" className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span>Real-Time Event Stream</span>
            </span>
            <Badge variant="primary" size="sm">
              Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Supabase Realtime CDC stream active on shifts, work orders, and attendance clock-ins.
          </p>
          <div className="text-[11px] text-slate-400">
            Avg broadcast latency:{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">14ms</strong>
          </div>
        </Card>
      </div>

      {/* Tenant Directory Section */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Platform Tenant Directory
            </h2>
            <p className="text-xs text-slate-500">
              Inspect, partition, and monitor all provisioned organizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48 sm:w-64">
              <Input
                placeholder="Search tenant or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                className="text-xs"
              />
            </div>

            <div className="w-32">
              <Select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                options={[
                  { value: 'all', label: 'All Tiers' },
                  { value: 'starter', label: 'Starter' },
                  { value: 'growth', label: 'Growth' },
                  { value: 'enterprise', label: 'Enterprise' }
                ]}
              />
            </div>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredTenants}
          emptyMessage="No tenants matched search criteria."
        />
      </Card>

      {/* Provision Tenant Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision New Enterprise Tenant"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTenant}>
              Provision Tenant
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTenant} className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="e.g. Pacific Freight Carriers"
            value={newOrgName}
            onChange={(e) => {
              setNewOrgName(e.target.value);
              setNewSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '')
              );
            }}
            required
          />

          <Input
            label="Subdomain / Slug"
            placeholder="pacific-freight"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            required
          />

          <Input
            label="Initial Owner Admin Email"
            type="email"
            placeholder="director@pacificfreight.com"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />

          <Select
            label="Subscription Tier"
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            options={[
              { value: 'starter', label: 'Starter Tier ($99/mo)' },
              { value: 'growth', label: 'Growth Tier ($299/mo)' },
              { value: 'enterprise', label: 'Enterprise Tier ($799/mo)' }
            ]}
          />

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Automatic Provisioning Steps:
            </div>
            <div>• Row-Level Security partition allocation</div>
            <div>• Storage bucket folder prefix setup</div>
            <div>• Invitation token dispatched to owner email</div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboardPage;
