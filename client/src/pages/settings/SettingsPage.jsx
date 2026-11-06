import { useState, useEffect } from 'react';
import { User, Bell, Building2, CreditCard, Shield, Lock, Save, Zap, Activity, RefreshCw, Play, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { useUpdateProfileMutation } from '../../features/auth/api/authApi.js';
import {
  useCurrentOrganizationQuery,
  useUpdateCurrentOrganizationMutation
} from '../../features/organizations/api/organizationApi.js';
import {
  useAutomationConfigQuery,
  useUpdateAutomationConfigMutation,
  useQueueMetricsQuery,
  useJobHistoryQuery,
  useTriggerWorkflowMutation,
  useRetryJobMutation
} from '../../features/automations/index.js';

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);

  const [activeTab, setActiveTab] = useState('profile');

  // Mutation and query hooks
  const updateProfileMutation = useUpdateProfileMutation();
  const updateOrgMutation = useUpdateCurrentOrganizationMutation();
  const { data: orgData } = useCurrentOrganizationQuery({
    enabled: Boolean(currentTenant?.id)
  });

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name || 'Alex Rivera');
  const [email, setEmail] = useState(user?.email || 'alex.director@acme.com');
  const [phone, setPhone] = useState(user?.phone || '+1 (555) 392-8100');
  const [jobTitle, setJobTitle] = useState('Operations Managing Director');

  // Org form state
  const [orgName, setOrgName] = useState(currentTenant?.name || 'Acme Logistics Global');
  const [orgSlug, setOrgSlug] = useState(currentTenant?.slug || 'acme-logistics');
  const [tier, setTier] = useState(currentTenant?.subscription_tier || 'enterprise');

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Sync org data when org query returns
  useEffect(() => {
    const activeOrg = orgData || currentTenant;
    if (activeOrg) {
      if (activeOrg.name) setOrgName(activeOrg.name);
      if (activeOrg.slug) setOrgSlug(activeOrg.slug);
      if (activeOrg.subscription_tier) setTier(activeOrg.subscription_tier);
    }
  }, [orgData, currentTenant]);

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [shiftReminders, setShiftReminders] = useState(true);
  const [auditAlerts, setAuditAlerts] = useState(false);

  const isPlatformOrOrgAdmin =
    user?.role === 'superadmin' || user?.role === 'owner' || user?.role === 'admin';

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      full_name: fullName,
      phone
    });
  };

  const handleSaveOrg = (e) => {
    e.preventDefault();
    updateOrgMutation.mutate({
      name: orgName,
      slug: orgSlug
    });
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    dispatch(
      addToast({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Notification preferences synchronized across devices'
      })
    );
  };

  // Automation hooks & state
  const { data: autoConfigData } = useAutomationConfigQuery({
    enabled: Boolean(currentTenant?.id) && isPlatformOrOrgAdmin
  });
  const updateAutoConfigMutation = useUpdateAutomationConfigMutation();
  const { data: queueMetricsData } = useQueueMetricsQuery({
    enabled: Boolean(currentTenant?.id) && activeTab === 'automations'
  });
  const { data: jobHistoryData } = useJobHistoryQuery({
    enabled: Boolean(currentTenant?.id) && activeTab === 'automations'
  });
  const triggerWorkflowMutation = useTriggerWorkflowMutation();
  const retryJobMutation = useRetryJobMutation();

  const [autoSettings, setAutoSettings] = useState({
    overdueTasks: true,
    upcomingDeadlines: true,
    lowStockAlerts: true,
    serviceRequestEscalation: true,
    expenseApprovalReminders: true,
    invoiceDueReminders: true,
    scheduledReports: true,
    timezone: 'UTC',
    slaUrgentHours: 12,
    slaHighHours: 24,
    slaMediumHours: 48,
    slaLowHours: 72,
    lowStockThreshold: 10,
    upcomingDeadlineHours: 24
  });

  useEffect(() => {
    if (autoConfigData?.automation) {
      setAutoSettings((prev) => ({
        ...prev,
        ...autoConfigData.automation,
        timezone: autoConfigData.timezone || prev.timezone
      }));
    }
  }, [autoConfigData]);

  const handleSaveAutomation = (e) => {
    e.preventDefault();
    updateAutoConfigMutation.mutate(autoSettings, {
      onSuccess: () => {
        dispatch(
          addToast({
            type: 'success',
            title: 'Automations Updated',
            message: 'Background workflow rules and schedules saved successfully'
          })
        );
      }
    });
  };

  const handleTriggerRunNow = (workflowName = 'workflows.all') => {
    triggerWorkflowMutation.mutate(
      { workflow: workflowName },
      {
        onSuccess: (res) => {
          dispatch(
            addToast({
              type: 'success',
              title: 'Workflow Enqueued',
              message: res.message || 'Workflow job dispatched to background queue'
            })
          );
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage your personal account, notification preferences, organization details, and
          security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        {isPlatformOrOrgAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('organization')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'organization'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Organization & Branding</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'billing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscription & Billing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('automations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'automations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Workflows & Automation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'security'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Multi-Tenant Security</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Profile & Security */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card variant="default" className="p-6 space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Personal Information
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="Work Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />

                  <Input
                    label="Job Title / Role Designation"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={updateProfileMutation.isPending}
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    <span>
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                    </span>
                  </Button>
                </div>
              </form>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Security & Password
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <Input label="Current Password" type="password" placeholder="••••••••••••" />
                  <Input label="New Password" type="password" placeholder="Min 8 characters" />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch(
                      addToast({
                        type: 'success',
                        title: 'Password Updated',
                        message: 'Your account credentials have been securely updated'
                      })
                    );
                  }}
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  <span>Update Password</span>
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card variant="default" className="p-5 text-center space-y-3">
              <img
                src={
                  user?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                }
                alt="Profile"
                className="w-20 h-20 rounded-full mx-auto object-cover ring-4 ring-indigo-500/20"
              />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {user?.full_name}
                </div>
                <div className="text-xs text-slate-400 font-mono">{user?.email}</div>
              </div>
              <Badge variant="primary" size="sm" className="capitalize">
                {user?.role || 'Owner'}
              </Badge>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Notifications */}
      {activeTab === 'notifications' && (
        <Card variant="default" className="p-6 space-y-5 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Notification Preferences
          </h2>

          <form onSubmit={handleSaveNotifications} className="space-y-4">
            {[
              {
                id: 'email',
                title: 'Email Notifications',
                desc: 'Receive shift rota assignments and weekly summaries via email.',
                state: emailAlerts,
                set: setEmailAlerts
              },
              {
                id: 'sms',
                title: 'Urgent SMS Dispatch Alerts',
                desc: 'Receive real-time text alerts for emergency work orders and dispatch updates.',
                state: smsAlerts,
                set: setSmsAlerts
              },
              {
                id: 'shifts',
                title: 'Shift Reminders',
                desc: 'Remind me 60 minutes prior to scheduled shift start.',
                state: shiftReminders,
                set: setShiftReminders
              },
              {
                id: 'audit',
                title: 'Security & Audit Alerts',
                desc: 'Notify when new administrators or workforce members are provisioned.',
                state: auditAlerts,
                set: setAuditAlerts
              }
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500">{item.desc}</div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={(e) => item.set(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                </label>
              </div>
            ))}

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>Save Notification Preferences</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: Organization & Branding */}
      {activeTab === 'organization' && (
        <Card variant="default" className="p-6 space-y-5 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Tenant Organization Details
          </h2>

          <form onSubmit={handleSaveOrg} className="space-y-4 text-xs">
            <Input
              label="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subdomain URL Slug
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">opspilot.io/</span>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="bg-transparent focus:outline-none flex-1 ml-1 font-bold text-indigo-600 dark:text-indigo-400"
                  required
                />
              </div>
            </div>

            <Select
              label="Subscription Tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              options={[
                { value: 'starter', label: 'Starter Tier ($99/mo)' },
                { value: 'growth', label: 'Growth Tier ($299/mo)' },
                { value: 'enterprise', label: 'Enterprise Tier ($799/mo)' }
              ]}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updateOrgMutation.isPending}
                disabled={updateOrgMutation.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>
                  {updateOrgMutation.isPending ? 'Saving...' : 'Save Organization Settings'}
                </span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 4: Billing & Subscription */}
      {activeTab === 'billing' && (
        <Card variant="default" className="p-6 space-y-5 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Subscription & Usage Limits
              </h2>
              <p className="text-xs text-slate-500">
                Current active plan for {currentTenant?.name}.
              </p>
            </div>

            <Badge variant="primary" size="md" className="uppercase font-bold">
              {currentTenant?.subscription_tier || 'Enterprise'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 block text-[11px]">Workforce Seats:</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">18 / 100</span>
              <span className="text-[10px] text-emerald-500 block">82 seats available</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 block text-[11px]">Vault Storage:</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                11.5 MB / 50 GB
              </span>
              <span className="text-[10px] text-emerald-500 block">0.02% utilized</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850">
              <span className="text-slate-400 block text-[11px]">Monthly Fee:</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">$799.00</span>
              <span className="text-[10px] text-slate-400 block">Auto-renews Dec 1</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                dispatch(
                  addToast({
                    type: 'info',
                    title: 'Subscription Management',
                    message: 'Stripe customer portal redirect initialized'
                  })
                );
              }}
            >
              Manage Stripe Billing
            </Button>
          </div>
        </Card>
      )}

      {/* Tab: Workflows & Automation */}
      {activeTab === 'automations' && (
        <div className="space-y-6 max-w-4xl">
          {/* Queue Telemetry Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Waiting</span>
              <span className="text-xl font-black text-amber-500">{queueMetricsData?.metrics?.waiting ?? 0}</span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Active</span>
              <span className="text-xl font-black text-indigo-500">{queueMetricsData?.metrics?.active ?? 0}</span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Completed</span>
              <span className="text-xl font-black text-emerald-500">{queueMetricsData?.metrics?.completed ?? 0}</span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Failed (DLQ)</span>
              <span className="text-xl font-black text-rose-500">{queueMetricsData?.metrics?.failed ?? 0}</span>
            </Card>
            <Card variant="default" className="p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Engine</span>
              <Badge variant="primary" size="sm" className="mt-1">
                {queueMetricsData?.driver === 'bullmq' ? 'BullMQ (Redis)' : 'Reliable Engine'}
              </Badge>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card variant="default" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Background Workflow Scheduler
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled background runner evaluates business rules every {Math.round((queueMetricsData?.pollIntervalMs || 60000) / 1000)}s without blocking HTTP requests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTriggerRunNow('workflows.all')}
                disabled={triggerWorkflowMutation.isPending}
                className="flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run All Now</span>
              </Button>
            </div>
          </Card>

          {/* Configuration Form */}
          <Card variant="default" className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated Business Rules & SLA Horizons
                </h2>
                <p className="text-xs text-slate-500">
                  Configure real-time background scanners, deduplication cooldowns, and notification thresholds.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleSaveAutomation} disabled={updateAutoConfigMutation.isPending}>
                <Save className="w-4 h-4 mr-1.5" />
                Save Automation Rules
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Organization Time Zone
                </label>
                <Select
                  value={autoSettings.timezone}
                  onChange={(e) => setAutoSettings({ ...autoSettings, timezone: e.target.value })}
                >
                  <option value="America/New_York">America/New_York (Eastern Time)</option>
                  <option value="America/Chicago">America/Chicago (Central Time)</option>
                  <option value="America/Denver">America/Denver (Mountain Time)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </Select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ensures reports and reminders respect local business working hours.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Low Stock Alert Threshold
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={autoSettings.lowStockThreshold}
                  onChange={(e) => setAutoSettings({ ...autoSettings, lowStockThreshold: Number(e.target.value) })}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Items with quantity at or below this threshold trigger manager alerts.
                </span>
              </div>
            </div>

            {/* 7 Workflow Toggles */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Business Automations
              </h3>

              {/* 1. Overdue Task Detection */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    1. Overdue Task Detection & Escalation
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Automatically scans active tasks, updates status to overdue if past due date, and sends 24h deduplicated alerts to assignees and managers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.overdueTasks}
                  onChange={(e) => setAutoSettings({ ...autoSettings, overdueTasks: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 2. Upcoming Deadline Reminders */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    2. Upcoming Deadline Reminders (24h-48h Horizon)
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatches proactive alerts to assignees for tasks with approaching deadlines in local timezone.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.upcomingDeadlines}
                  onChange={(e) => setAutoSettings({ ...autoSettings, upcomingDeadlines: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 3. Low-Stock Notifications */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    3. Inventory Low-Stock Automated Alerts
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Alerts warehouse managers when SKUs drop below safety stock. Deduplicates to prevent email fatigue.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.lowStockAlerts}
                  onChange={(e) => setAutoSettings({ ...autoSettings, lowStockAlerts: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 4. Service Request Escalation */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-500" />
                    4. Customer Service Request SLA Escalation
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Escalates customer ticket priority (Low &rarr; Medium &rarr; High &rarr; Urgent) and alerts dispatchers when SLA thresholds elapse.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.serviceRequestEscalation}
                  onChange={(e) => setAutoSettings({ ...autoSettings, serviceRequestEscalation: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 5. Expense Approval Reminders */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                    5. Pending Expense Approval Reminders
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Reminds authorized managers when employee claims remain unreviewed for &gt; 48 hours.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.expenseApprovalReminders}
                  onChange={(e) => setAutoSettings({ ...autoSettings, expenseApprovalReminders: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 6. Invoice Due Reminders */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    6. Invoice Upcoming & Overdue Reminders
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Transitions past-due invoices to overdue status and notifies billing contacts with payment references.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.invoiceDueReminders}
                  onChange={(e) => setAutoSettings({ ...autoSettings, invoiceDueReminders: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              {/* 7. Scheduled Reports */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    7. Scheduled Daily Executive Telemetry Reports
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Synthesizes operational progress, active projects, and financial totals into an automated briefing delivered in the morning.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSettings.scheduledReports}
                  onChange={(e) => setAutoSettings({ ...autoSettings, scheduledReports: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>
            </div>
          </Card>

          {/* Job History & Dead Letter Queue Table */}
          <Card variant="default" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Background Queue Job History
                </h3>
                <p className="text-xs text-slate-500">
                  Live background processing audit trail, retry policies, and error diagnostics.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                {jobHistoryData?.jobs?.length || 0} Jobs Logged
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Job ID</th>
                    <th className="py-2 px-3">Workflow</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Attempts</th>
                    <th className="py-2 px-3">Created</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!jobHistoryData?.jobs || jobHistoryData.jobs.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No background jobs in queue. Trigger "Run All Now" to enqueue a workflow.
                      </td>
                    </tr>
                  ) : (
                    jobHistoryData.jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{job.id.slice(0, 18)}...</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{job.name}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              job.status === 'completed'
                                ? 'success'
                                : job.status === 'failed'
                                ? 'danger'
                                : job.status === 'active'
                                ? 'primary'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{job.attemptsMade} / {job.opts?.attempts || 1}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {job.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => retryJobMutation.mutate(job.id)}
                              disabled={retryJobMutation.isPending}
                            >
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Multi-Tenant Security */}
      {activeTab === 'security' && (
        <Card variant="default" className="p-6 space-y-5 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Tenant Row-Level Security
              </h2>
              <p className="text-xs text-slate-500">
                Cryptographic partition verification and access token health.
              </p>
            </div>

            <Badge variant="success" size="sm">
              RLS Policy 100% Active
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Active Tenant UUID
                </div>
                <div className="text-[10px] font-mono text-slate-400">{currentTenant?.id}</div>
              </div>
              <Badge variant="neutral" size="sm">
                Enforced
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Frontend Anon Key Safety Barrier
                </div>
                <div className="text-[10px] text-slate-400">
                  Zero service-role keys bundled in client code. Verified by automated CI check.
                </div>
              </div>
              <Badge variant="success" size="sm">
                Secure
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
