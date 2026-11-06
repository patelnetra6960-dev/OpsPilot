/**
 * OpsPilot SaaS Subscription Plans & Resource Tier Definitions
 * Defines standard tiers, pricing, limits, and feature entitlements.
 */

export const DEFAULT_SUBSCRIPTION_PLANS = {
  starter: {
    id: 'plan_starter',
    tier: 'starter',
    name: 'Starter Plan',
    slug: 'starter',
    description: 'Essential field operations, shift scheduling, and dispatch for growing logistics teams',
    price_monthly: 99.0,
    price_yearly: 990.0,
    currency: 'USD',
    trial_days: 14,
    is_active: true,
    limits: {
      max_members: 15,
      max_projects: 25,
      max_tasks: 200,
      storage_gb: 10,
      custom_branding: false,
      priority_support: false,
      automated_workflows: false,
      geofencing: false
    },
    features: [
      'Up to 15 workforce team members',
      '25 active projects & 200 tasks',
      'Basic dispatch & work order checklists',
      'Standard inventory & asset registry',
      '10 GB encrypted document storage',
      'Invoice & expense tracking',
      'Standard email support'
    ]
  },
  growth: {
    id: 'plan_growth',
    tier: 'growth',
    name: 'Growth Plan',
    slug: 'growth',
    description: 'Advanced automation, GPS geofencing, and multi-team collaboration',
    price_monthly: 299.0,
    price_yearly: 2990.0,
    currency: 'USD',
    trial_days: 14,
    is_active: true,
    limits: {
      max_members: 50,
      max_projects: 100,
      max_tasks: 1000,
      storage_gb: 50,
      custom_branding: true,
      priority_support: true,
      automated_workflows: true,
      geofencing: true
    },
    features: [
      'Up to 50 workforce team members',
      '100 active projects & 1,000 tasks',
      'GPS geofenced mobile attendance & rota',
      'Automated background business rules (BullMQ)',
      'Digital proof-of-work customer sign-offs',
      '50 GB encrypted document storage',
      'Custom branding & company themes',
      'Priority ticket & live chat support'
    ]
  },
  enterprise: {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise Plan',
    slug: 'enterprise',
    description: 'High-scale infrastructure, dedicated SLA, custom limits, and audit compliance',
    price_monthly: 799.0,
    price_yearly: 7990.0,
    currency: 'USD',
    trial_days: 30,
    is_active: true,
    limits: {
      max_members: 250,
      max_projects: 1000,
      max_tasks: 10000,
      storage_gb: 500,
      custom_branding: true,
      priority_support: true,
      automated_workflows: true,
      geofencing: true
    },
    features: [
      'Up to 250 workforce members (or custom seats)',
      'Unlimited projects, tasks & agile boards',
      'Real-time WebSocket dispatch telemetry',
      '500 GB high-throughput document storage',
      'Complete audit trail ledger export',
      'Multi-currency & custom tax configurations',
      'Dedicated Customer Success Manager',
      '99.9% Uptime Service Level Agreement (SLA)'
    ]
  }
};

// In-memory mutable cache allowing Super Admin runtime configuration in mock/dev mode
let activePlans = JSON.parse(JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));

export const getSubscriptionPlans = () => {
  return activePlans;
};

export const getSubscriptionPlan = (tier) => {
  const normalized = (tier || 'starter').toLowerCase();
  return activePlans[normalized] || activePlans.starter;
};

export const updateSubscriptionPlan = (tier, updates) => {
  const normalized = (tier || '').toLowerCase();
  if (!activePlans[normalized]) {
    const err = new Error(`Subscription plan '${tier}' not found`);
    err.status = 404;
    err.code = 'PLAN_NOT_FOUND';
    throw err;
  }

  activePlans[normalized] = {
    ...activePlans[normalized],
    ...updates,
    limits: {
      ...activePlans[normalized].limits,
      ...(updates.limits || {})
    }
  };

  return activePlans[normalized];
};

export const resetSubscriptionPlans = () => {
  activePlans = JSON.parse(JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));
};

export default {
  DEFAULT_SUBSCRIPTION_PLANS,
  getSubscriptionPlans,
  getSubscriptionPlan,
  updateSubscriptionPlan,
  resetSubscriptionPlans
};
