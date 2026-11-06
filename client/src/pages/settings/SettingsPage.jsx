import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Building2,
  CreditCard,
  Shield,
  Save,
  Zap,
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  Palette,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { useUpdateProfileMutation } from '../../features/auth/api/authApi.js';
import {
  useCurrentOrganizationQuery,
  useUpdateCurrentOrganizationMutation,
  useOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
  useSubscriptionQuery,
  useSubscriptionPlansQuery,
  useUpgradeSubscriptionMutation,
  useDowngradeSubscriptionMutation,
  useCancelSubscriptionMutation,
  useReactivateSubscriptionMutation
} from '../../features/organizations/api/organizationApi.js';
import {
  useAutomationConfigQuery,
  useUpdateAutomationConfigMutation,
  useQueueMetricsQuery,
  useJobHistoryQuery,
  useTriggerWorkflowMutation
} from '../../features/automations/index.js';

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);

  const [activeTab, setActiveTab] = useState('profile');

  // Queries & Mutations
  const updateProfileMutation = useUpdateProfileMutation();
  const updateOrgMutation = useUpdateCurrentOrganizationMutation();
  const { data: orgData } = useCurrentOrganizationQuery({
    enabled: Boolean(currentTenant?.id)
  });
  const { data: settingsData } = useOrganizationSettingsQuery({
    enabled: Boolean(currentTenant?.id)
  });
  const updateSettingsMutation = useUpdateOrganizationSettingsMutation();

  const { data: subscriptionData, isLoading: isSubLoading } = useSubscriptionQuery({
    enabled: Boolean(currentTenant?.id)
  });
  const { data: plansData } = useSubscriptionPlansQuery();
  const upgradeSubMutation = useUpgradeSubscriptionMutation();
  const downgradeSubMutation = useDowngradeSubscriptionMutation();
  const cancelSubMutation = useCancelSubscriptionMutation();
  const reactivateSubMutation = useReactivateSubscriptionMutation();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || 'Alex Rivera');
  const [email, setEmail] = useState(user?.email || 'alex.director@acme.com');
  const [phone, setPhone] = useState(user?.phone || '+1 (555) 392-8100');

  // Organization General State
  const [orgName, setOrgName] = useState(currentTenant?.name || 'Acme Logistics Global');
  const [orgSlug, setOrgSlug] = useState(currentTenant?.slug || 'acme-logistics');

  // Branding State
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [accentColor, setAccentColor] = useState('#06B6D4');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: ''
  });

  // Organization Preferences State
  const [timezone, setTimezone] = useState('America/New_York');
  const [locale, setLocale] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [fiscalYearStart, setFiscalYearStart] = useState(1);

  // Notification Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [eventAlerts, setEventAlerts] = useState({
    shift_reminders: true,
    dispatch_alerts: true,
    overdue_tasks: true,
    invoice_due: true,
    expense_approvals: true,
    audit_security: false
  });

  // Subscription Billing State
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);
  const [planActionType, setPlanActionType] = useState('upgrade'); // 'upgrade' | 'downgrade'
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Sync org data
  useEffect(() => {
    const activeOrg = orgData || currentTenant;
    if (activeOrg) {
      if (activeOrg.name) setOrgName(activeOrg.name);
      if (activeOrg.slug) setOrgSlug(activeOrg.slug);
    }
  }, [orgData, currentTenant]);

  // Sync settings data
  useEffect(() => {
    if (settingsData) {
      const b = settingsData.branding || {};
      setLogoUrl(b.logo_url || '');
      setPrimaryColor(b.primary_color || '#4F46E5');
      setAccentColor(b.accent_color || '#06B6D4');
      setWebsite(b.website || '');
      setContactEmail(b.contact_email || '');
      setContactPhone(b.contact_phone || '');
      if (b.address) {
        setAddress({
          street: b.address.street || '',
          city: b.address.city || '',
          state: b.address.state || '',
          postal_code: b.address.postal_code || '',
          country: b.address.country || ''
        });
      }

      const p = settingsData.preferences || {};
      setTimezone(p.timezone || settingsData.timezone || 'America/New_York');
      setLocale(p.locale || 'en-US');
      setCurrency(p.currency || settingsData.currency || 'USD');
      setDateFormat(p.date_format || 'YYYY-MM-DD');
      setFiscalYearStart(p.fiscal_year_start || 1);

      const n = settingsData.notifications || {};
      setEmailAlerts(n.email_alerts ?? true);
      setSmsAlerts(n.sms_alerts ?? true);
      setPushAlerts(n.push_alerts ?? true);
      setWebhookUrl(n.webhook_url || '');
      if (n.events) {
        setEventAlerts((prev) => ({ ...prev, ...n.events }));
      }
    }
  }, [settingsData]);

  const isPlatformOrOrgAdmin =
    user?.role === 'superadmin' || user?.role === 'owner' || user?.role === 'admin';

  // Profile Save
  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      full_name: fullName,
      phone
    });
  };

  // Organization & Branding Save
  const handleSaveOrganizationAndBranding = (e) => {
    e.preventDefault();
    // 1. Update org name and slug
    updateOrgMutation.mutate({
      name: orgName,
      slug: orgSlug
    });

    // 2. Update branding & preferences settings
    updateSettingsMutation.mutate({
      branding: {
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        website,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address
      },
      preferences: {
        timezone,
        locale,
        currency,
        date_format: dateFormat,
        fiscal_year_start: Number(fiscalYearStart)
      },
      timezone,
      currency
    });
  };

  // Notification Preferences Save
  const handleSaveNotificationPreferences = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      notifications: {
        email_alerts: emailAlerts,
        sms_alerts: smsAlerts,
        push_alerts: pushAlerts,
        webhook_url: webhookUrl || null,
        events: eventAlerts
      }
    });
  };

  // Automation hooks & state
  const { data: autoConfigData } = useAutomationConfigQuery({
    enabled: Boolean(currentTenant?.id) && isPlatformOrOrgAdmin
  });
  const updateAutoConfigMutation = useUpdateAutomationConfigMutation();
  const { data: queueMetricsData } = useQueueMetricsQuery({
    enabled: Boolean(currentTenant?.id) && activeTab === 'automations'
  });
  const triggerWorkflowMutation = useTriggerWorkflowMutation();

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

  // Plan Selection Handler
  const handleOpenPlanModal = (targetPlan) => {
    const currentTier = (subscriptionData?.tier || 'starter').toLowerCase();
    const tierRank = { starter: 1, growth: 2, enterprise: 3 };
    const isDowngrade = (tierRank[targetPlan.tier] || 1) < (tierRank[currentTier] || 1);

    setSelectedPlanForModal(targetPlan);
    setPlanActionType(isDowngrade ? 'downgrade' : 'upgrade');
    setIsPlanModalOpen(true);
  };

  const handleConfirmPlanChange = () => {
    if (!selectedPlanForModal) return;

    if (planActionType === 'upgrade') {
      upgradeSubMutation.mutate(
        {
          targetTier: selectedPlanForModal.tier,
          billingCycle: billingInterval,
          simulatedPaymentMethod: 'Simulated Card •••• 4242'
        },
        {
          onSuccess: () => {
            setIsPlanModalOpen(false);
          }
        }
      );
    } else {
      downgradeSubMutation.mutate(
        {
          targetTier: selectedPlanForModal.tier,
          billingCycle: billingInterval,
          reason: 'Adjusted by administrator from settings'
        },
        {
          onSuccess: () => {
            setIsPlanModalOpen(false);
          }
        }
      );
    }
  };

  // Downgrade validation check against current usage
  const activeMembers = subscriptionData?.usage?.members || 0;
  const isDowngradeBlocked =
    planActionType === 'downgrade' &&
    selectedPlanForModal &&
    activeMembers > selectedPlanForModal.limits.max_members;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Settings & Organization Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage corporate branding, timezone, notification delivery channels, subscriptions, and
          usage limits.
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
          <span>Notification Preferences</span>
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
              <span>Company Profile & Branding</span>
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
                    label="Email Address"
                    type="email"
                    value={email}
                    disabled
                    helperText="Managed via SSO/Identity Provider"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Direct Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="System Role"
                    value={user?.role?.toUpperCase() || 'OWNER'}
                    disabled
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
                    <span>{updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card variant="default" className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    user?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {user?.full_name || 'Alex Rivera'}
                  </h3>
                  <Badge variant="primary" size="sm" className="uppercase font-mono text-[10px] mt-1">
                    {user?.role || 'owner'}
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Active tenant: <strong className="text-slate-700 dark:text-slate-300">{currentTenant?.name}</strong>
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Notification Preferences */}
      {activeTab === 'notifications' && (
        <Card variant="default" className="p-6 space-y-6 max-w-4xl">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Notification Delivery Channels & Triggers
            </h2>
            <p className="text-xs text-slate-500">
              Configure how and where your team receives operational alerts, dispatch dispatches, and
              system reminders.
            </p>
          </div>

          <form onSubmit={handleSaveNotificationPreferences} className="space-y-6 text-xs">
            {/* Delivery Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Delivery Channels
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-white">
                      Email Delivery
                    </span>
                    <span className="text-[11px] text-slate-400">Shift rotas & reports</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-white">
                      SMS Text Alerts
                    </span>
                    <span className="text-[11px] text-slate-400">Urgent field dispatch</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsAlerts}
                    onChange={(e) => setSmsAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-white">
                      In-App & Push
                    </span>
                    <span className="text-[11px] text-slate-400">Real-time WebSockets</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushAlerts}
                    onChange={(e) => setPushAlerts(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Webhook URL */}
              <div className="pt-2">
                <Input
                  label="Outgoing Webhook URL (Slack / Microsoft Teams / Custom Endpoint)"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  helperText="Dispatches JSON payloads for dispatch events and work order completions"
                />
              </div>
            </div>

            {/* Event Triggers */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Operational Event Triggers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'shift_reminders',
                    label: 'Shift Rota & Clock-In Reminders',
                    desc: 'Notify field workers 60 minutes prior to scheduled shift start'
                  },
                  {
                    key: 'dispatch_alerts',
                    label: 'Emergency Work Order Dispatch',
                    desc: 'Instant alert when a technician is assigned to an urgent work order'
                  },
                  {
                    key: 'overdue_tasks',
                    label: 'Overdue Task & SLA Horizon Warnings',
                    desc: 'Automated background scanner alerts for tasks past their due date'
                  },
                  {
                    key: 'invoice_due',
                    label: 'Invoice Due & Payment Reminders',
                    desc: 'Automated reminder notices for overdue customer invoices'
                  },
                  {
                    key: 'expense_approvals',
                    label: 'Expense Submission & Approval Alerts',
                    desc: 'Notify managers when team expenses require sign-off'
                  },
                  {
                    key: 'audit_security',
                    label: 'Security & Membership Audits',
                    desc: 'Alert administrators when new members join or roles are altered'
                  }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(eventAlerts[item.key])}
                      onChange={(e) =>
                        setEventAlerts((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updateSettingsMutation.isPending}
                disabled={updateSettingsMutation.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>Save Notification Preferences</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: Organization & Branding */}
      {activeTab === 'organization' && (
        <Card variant="default" className="p-6 space-y-6 max-w-4xl">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Company Profile, Visual Branding & Regional Preferences
            </h2>
            <p className="text-xs text-slate-500">
              Customize your corporate identity, timezone, currency, and physical address across all
              invoices, reports, and portal views.
            </p>
          </div>

          <form onSubmit={handleSaveOrganizationAndBranding} className="space-y-6 text-xs">
            {/* Identity & Subdomain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Subdomain Slug
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
            </div>

            {/* Visual Branding: Logo & Colors */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                <span>Visual Brand Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-2 flex flex-col items-center gap-1">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Brand Logo"
                      className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-sm"
                      onError={() => setLogoUrl('')}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 font-bold text-xl">
                      {orgName.charAt(0) || 'O'}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">Logo Preview</span>
                </div>

                <div className="sm:col-span-10 space-y-3">
                  <Input
                    label="Company Logo Image URL"
                    placeholder="https://domain.com/brand-logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    helperText="Recommended: 256x256 PNG or SVG with transparent background"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Primary Brand Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="font-mono text-xs uppercase px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-28"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Accent Brand Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="font-mono text-xs uppercase px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-28"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Preferences & Localization */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Regional Settings, Timezone & Locale</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Timezone
                  </label>
                  <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="America/New_York">America/New_York (UTC-5 / Eastern)</option>
                    <option value="America/Chicago">America/Chicago (UTC-6 / Central)</option>
                    <option value="America/Denver">America/Denver (UTC-7 / Mountain)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8 / Pacific)</option>
                    <option value="Europe/London">Europe/London (UTC+0 / GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1 / CET)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30 / IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9 / JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (UTC+10 / AEST)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Currency
                  </label>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Display Format
                  </label>
                  <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK & Europe)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Locale & Language
                  </label>
                  <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="es-ES">Spanish (Español)</option>
                    <option value="fr-FR">French (Français)</option>
                    <option value="de-DE">German (Deutsch)</option>
                    <option value="ja-JP">Japanese (日本語)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fiscal Year Start Month
                  </label>
                  <Select
                    value={fiscalYearStart}
                    onChange={(e) => setFiscalYearStart(Number(e.target.value))}
                  >
                    <option value={1}>January (Standard Calendar)</option>
                    <option value={4}>April (UK / Commonwealth Standard)</option>
                    <option value={7}>July (Mid-Year)</option>
                    <option value={10}>October (US Federal Standard)</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Details & Official Address */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                <span>Contact & Corporate Headquarters Address</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Official Website"
                  placeholder="https://acme-logistics.global"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <Input
                  label="Contact / Support Email"
                  placeholder="contact@acme-logistics.global"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <Input
                  label="Contact Phone"
                  placeholder="+1 (555) 392-8100"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <Input
                    label="Street Address"
                    placeholder="100 Harbor Way, Suite 400"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="City"
                    placeholder="New York"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="State / Province"
                    placeholder="NY"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-6">
                  <Input
                    label="Postal Code"
                    placeholder="10004"
                    value={address.postal_code}
                    onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-6">
                  <Input
                    label="Country"
                    placeholder="United States"
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updateSettingsMutation.isPending || updateOrgMutation.isPending}
                disabled={updateSettingsMutation.isPending || updateOrgMutation.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>Save Organization & Branding</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 4: Subscription & Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-6 max-w-5xl">
          {/* Simulated Billing Disclaimer Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>MVP Simulated Billing Mode:</strong> Subscription state transitions,
                invoices, and usage limits are verified in mock simulation. No actual credit card is
                charged.
              </span>
            </div>
            <Badge variant="warning" size="sm" className="shrink-0 uppercase font-bold text-[10px]">
              Simulated Mode
            </Badge>
          </div>

          {/* Current Active Plan Overview */}
          <Card variant="default" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                    {subscriptionData?.plan?.name || 'Enterprise Plan'}
                  </h2>
                  <Badge
                    variant={
                      subscriptionData?.status === 'active'
                        ? 'success'
                        : subscriptionData?.status === 'trialing'
                        ? 'primary'
                        : 'warning'
                    }
                    size="md"
                    className="uppercase font-bold text-[10px]"
                  >
                    {subscriptionData?.is_trial
                      ? `Trial (${subscriptionData.days_left_in_trial}d remaining)`
                      : subscriptionData?.status || 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active for <strong>{currentTenant?.name}</strong> • Billed{' '}
                  <span className="capitalize">{subscriptionData?.billing_cycle || 'yearly'}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ${subscriptionData?.plan?.price_monthly || 799}
                  <span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {subscriptionData?.billing_cycle === 'yearly'
                    ? `($${subscriptionData?.plan?.price_yearly || 7990}/yr billed annually)`
                    : 'Renews monthly'}
                </span>
              </div>
            </div>

            {/* Resource Usage vs Plan Limits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enforced Resource Usage vs Plan Limits
                </h3>
                <span className="text-[11px] text-slate-500">
                  Limits enforced on backend creation endpoints
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Workforce Seats */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Workforce Seats
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {subscriptionData?.usage?.members || 0} /{' '}
                      {subscriptionData?.limits?.max_members || 250}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (subscriptionData?.usage?.percentages?.members || 0) >= 90
                          ? 'bg-rose-500'
                          : (subscriptionData?.usage?.percentages?.members || 0) >= 75
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{
                        width: `${Math.min(100, subscriptionData?.usage?.percentages?.members || 0)}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{subscriptionData?.usage?.percentages?.members || 0}% allocated</span>
                    {subscriptionData?.usage?.is_member_limit_reached && (
                      <span className="text-rose-500 font-bold">Limit Reached</span>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Active Projects
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {subscriptionData?.usage?.projects || 0} /{' '}
                      {subscriptionData?.limits?.max_projects || 1000}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          subscriptionData?.usage?.percentages?.projects || 0
                        )}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{subscriptionData?.usage?.percentages?.projects || 0}% capacity</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Active Tasks
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {subscriptionData?.usage?.tasks || 0} /{' '}
                      {subscriptionData?.limits?.max_tasks || 10000}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, subscriptionData?.usage?.percentages?.tasks || 0)}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{subscriptionData?.usage?.percentages?.tasks || 0}% active</span>
                  </div>
                </div>

                {/* Document Storage */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Vault Storage
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {subscriptionData?.usage?.storage_mb || 11.5} MB /{' '}
                      {subscriptionData?.limits?.storage_gb || 500} GB
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          2,
                          subscriptionData?.usage?.percentages?.storage || 1
                        )}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Encrypted Bucket Storage</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Plan Comparison & Upgrade Selector */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Available Platform Subscription Plans
                </h3>
                <p className="text-xs text-slate-500">
                  Select a tier below to simulate upgrading or downgrading your workspace capacity.
                </p>
              </div>

              {/* Billing Cycle Selector */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    billingInterval === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('yearly')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    billingInterval === 'yearly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Annual Billing</span>
                  <Badge variant="success" size="sm" className="text-[9px] py-0 px-1">
                    SAVE 17%
                  </Badge>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(plansData || []).map((plan) => {
                const currentTier = (subscriptionData?.tier || 'starter').toLowerCase();
                const isCurrent = currentTier === plan.tier.toLowerCase();
                const price =
                  billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
                const monthlyEquiv =
                  billingInterval === 'yearly' ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

                return (
                  <Card
                    key={plan.id}
                    variant={isCurrent ? 'elevated' : 'default'}
                    className={`p-6 flex flex-col justify-between relative transition ${
                      isCurrent
                        ? 'border-2 border-indigo-600 dark:border-indigo-500 shadow-lg shadow-indigo-600/10'
                        : 'border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="primary" size="sm" className="uppercase font-bold tracking-wider">
                          Current Active Plan
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-black text-lg text-slate-900 dark:text-white capitalize">
                          {plan.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 min-h-[32px]">
                          {plan.description}
                        </p>
                      </div>

                      <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          ${monthlyEquiv}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </span>
                        {billingInterval === 'yearly' && (
                          <span className="text-[10px] text-emerald-600 block">
                            ${price}/year billed annually
                          </span>
                        )}
                      </div>

                      {/* Resource limits summary */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            <strong>{plan.limits.max_members}</strong> workforce seats
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            <strong>{plan.limits.max_projects}</strong> active projects
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            <strong>{plan.limits.storage_gb} GB</strong> vault storage
                          </span>
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6">
                      {isCurrent ? (
                        <Button variant="secondary" size="sm" className="w-full" disabled>
                          Current Active Plan
                        </Button>
                      ) : (
                        <Button
                          variant={plan.tier === 'enterprise' ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenPlanModal(plan)}
                        >
                          Select {plan.name}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Subscription History & Invoices */}
          <Card variant="default" className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Subscription & Billing Audit History</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Lifecycle Event</th>
                    <th className="pb-2.5">Plan Tier</th>
                    <th className="pb-2.5">Simulated Charge</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Invoice #</th>
                    <th className="pb-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {(subscriptionData?.history || []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white capitalize">
                        {(item.action || 'Subscription Update').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3">
                        <Badge variant="primary" size="sm" className="uppercase text-[9px]">
                          {item.to_tier || item.tier || 'Starter'}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                        ${item.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3">
                        <Badge variant="success" size="sm" className="capitalize text-[10px]">
                          {(item.status || 'Paid').replace(/simulated_/g, '')}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        {item.invoice_number || 'INV-001'}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            dispatch(
                              addToast({
                                type: 'info',
                                title: 'Receipt Download',
                                message: `Simulated receipt ${item.invoice_number || 'INV-001'} downloaded.`
                              })
                            );
                          }}
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Workflows & Automation */}
      {activeTab === 'automations' && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Waiting
              </span>
              <span className="text-xl font-black text-amber-500">
                {queueMetricsData?.metrics?.waiting ?? 0}
              </span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Active
              </span>
              <span className="text-xl font-black text-indigo-500">
                {queueMetricsData?.metrics?.active ?? 0}
              </span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Completed
              </span>
              <span className="text-xl font-black text-emerald-500">
                {queueMetricsData?.metrics?.completed ?? 0}
              </span>
            </Card>
            <Card variant="default" className="p-3 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Failed (DLQ)
              </span>
              <span className="text-xl font-black text-rose-500">
                {queueMetricsData?.metrics?.failed ?? 0}
              </span>
            </Card>
            <Card variant="default" className="p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Engine
              </span>
              <Badge variant="primary" size="sm" className="mt-1">
                {queueMetricsData?.driver === 'bullmq' ? 'BullMQ (Redis)' : 'Reliable Engine'}
              </Badge>
            </Card>
          </div>

          <Card variant="default" className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Background Workflow Scheduler
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled background runner evaluates business rules every{' '}
                {Math.round((queueMetricsData?.pollIntervalMs || 60000) / 1000)}s without blocking
                HTTP requests.
              </p>
            </div>
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
          </Card>

          <Card variant="default" className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated Business Rules & SLA Horizons
                </h2>
                <p className="text-xs text-slate-500">
                  Configure real-time background scanners, deduplication cooldowns, and notification
                  thresholds.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAutomation}
                disabled={updateAutoConfigMutation.isPending}
              >
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
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Low Stock Inventory Threshold (Units)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={autoSettings.lowStockThreshold}
                  onChange={(e) =>
                    setAutoSettings({ ...autoSettings, lowStockThreshold: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Multi-Tenant Security */}
      {activeTab === 'security' && (
        <Card variant="default" className="p-6 space-y-5 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Security Invariants & Row Level Security
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Row Level Security (RLS) Active</span>
            </div>
            <p className="text-slate-500">
              All database queries are bound to tenant ID{' '}
              <code className="text-indigo-600 dark:text-indigo-400 font-mono">
                {currentTenant?.id}
              </code>
              . Cross-tenant access is prohibited at the database engine layer.
            </p>
          </div>
        </Card>
      )}

      {/* Plan Change Modal (Upgrade / Downgrade) */}
      {isPlanModalOpen && selectedPlanForModal && (
        <Modal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          title={
            planActionType === 'upgrade'
              ? `Upgrade to ${selectedPlanForModal.name}`
              : `Downgrade to ${selectedPlanForModal.name}`
          }
        >
          <div className="space-y-4 text-xs">
            {isDowngradeBlocked ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Downgrade Blocked: Usage Exceeds Target Plan Limit</span>
                </div>
                <p>
                  Your organization currently has <strong>{activeMembers} active members</strong>,
                  which exceeds the <strong>{selectedPlanForModal.limits.max_members} seat limit</strong>{' '}
                  of the {selectedPlanForModal.name}.
                </p>
                <p className="text-[11px]">
                  Please remove {activeMembers - selectedPlanForModal.limits.max_members} member(s)
                  from your Workforce Directory before downgrading to this plan.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                <span className="font-bold block">
                  Simulated Billing Charge for {selectedPlanForModal.name}:
                </span>
                <span className="text-lg font-black block mt-0.5">
                  $
                  {billingInterval === 'yearly'
                    ? selectedPlanForModal.price_yearly
                    : selectedPlanForModal.price_monthly}
                  <span className="text-xs font-normal text-slate-500">
                    {' '}
                    /{billingInterval === 'yearly' ? 'year' : 'month'}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Payment will be processed via Simulated Visa •••• 4242.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Target Plan Entitlements:
              </span>
              <ul className="space-y-1 text-slate-500 text-[11px]">
                <li>• Up to {selectedPlanForModal.limits.max_members} workforce members</li>
                <li>• Up to {selectedPlanForModal.limits.max_projects} active projects</li>
                <li>• {selectedPlanForModal.limits.storage_gb} GB encrypted cloud storage</li>
              </ul>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={planActionType === 'upgrade' ? 'primary' : 'warning'}
                size="sm"
                onClick={handleConfirmPlanChange}
                disabled={
                  isDowngradeBlocked ||
                  upgradeSubMutation.isPending ||
                  downgradeSubMutation.isPending
                }
                loading={upgradeSubMutation.isPending || downgradeSubMutation.isPending}
              >
                {planActionType === 'upgrade' ? 'Confirm Simulated Upgrade' : 'Confirm Downgrade'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
