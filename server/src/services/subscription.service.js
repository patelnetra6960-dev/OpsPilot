import crypto from 'crypto';
import { supabaseAdmin, mockDatabase } from '../config/supabase.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import {
  getSubscriptionPlans,
  getSubscriptionPlan,
  updateSubscriptionPlan
} from '../config/subscriptionPlans.js';

export class SubscriptionService {
  /**
   * Return all active platform subscription plans with features & limits
   */
  async getPlans() {
    return Object.values(getSubscriptionPlans()).filter((p) => p.is_active);
  }

  /**
   * Return specific plan by tier name
   */
  async getPlanByTier(tier) {
    return getSubscriptionPlan(tier);
  }

  /**
   * Get Current Organization Resource Usage Metrics
   */
  async getOrganizationUsage(orgId) {
    let activeMembers = 0;
    let activeProjects = 0;
    let activeTasks = 0;
    let estimatedStorageBytes = 12058624; // ~11.5 MB default simulated document vault storage

    if (env.isMockMode || !supabaseAdmin) {
      activeMembers = (mockDatabase.memberships || []).filter(
        (m) => m.organization_id === orgId && m.status === 'active'
      ).length;

      activeProjects = (mockDatabase.projects || []).filter(
        (p) => p.organization_id === orgId && p.status !== 'archived' && !p.deleted_at
      ).length;

      activeTasks = (mockDatabase.tasks || []).filter(
        (t) => t.organization_id === orgId && t.column_name !== 'done' && !t.deleted_at
      ).length;
    } else {
      const [membersRes, projectsRes, tasksRes] = await Promise.all([
        supabaseAdmin
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active'),
        supabaseAdmin
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .neq('status', 'archived')
          .is('deleted_at', null),
        supabaseAdmin
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .neq('column_name', 'done')
          .is('deleted_at', null)
      ]);

      activeMembers = membersRes.count || 0;
      activeProjects = projectsRes.count || 0;
      activeTasks = tasksRes.count || 0;
    }

    const storageMb = +(estimatedStorageBytes / (1024 * 1024)).toFixed(2);
    const storageGb = +(storageMb / 1024).toFixed(3);

    return {
      members: activeMembers,
      projects: activeProjects,
      tasks: activeTasks,
      storage_bytes: estimatedStorageBytes,
      storage_mb: storageMb,
      storage_gb: storageGb
    };
  }

  /**
   * Retrieve Full Subscription Details for an Organization
   */
  async getOrganizationSubscription(orgId) {
    let org = null;

    if (env.isMockMode || !supabaseAdmin) {
      org = (mockDatabase.organizations || []).find((o) => o.id === orgId || o.slug === orgId);
    } else {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (!error && data) org = data;
    }

    if (!org) {
      const err = new Error(`Organization '${orgId}' not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const tier = (org.subscription_tier || 'starter').toLowerCase();
    const plan = getSubscriptionPlan(tier);
    const usage = await this.getOrganizationUsage(org.id);

    // Read stored subscription metadata from org.settings.subscription
    const subSettings = org.settings?.subscription || {};
    const status = subSettings.status || (tier === 'enterprise' ? 'active' : 'trialing');
    const billingCycle = subSettings.billing_cycle || 'monthly';
    const trialEndsAt = subSettings.trial_ends_at || null;
    const currentPeriodStart =
      subSettings.current_period_start || org.created_at || new Date().toISOString();
    const currentPeriodEnd =
      subSettings.current_period_end ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Trial calculation
    let isTrial = status === 'trialing';
    let daysLeftInTrial = 0;
    if (trialEndsAt) {
      const diffMs = new Date(trialEndsAt) - new Date();
      daysLeftInTrial = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (daysLeftInTrial === 0 && isTrial) {
        isTrial = false;
      }
    }

    // Effective resource limits (allows Super Admin custom overrides)
    const customLimits = subSettings.custom_limits || {};
    const effectiveLimits = {
      ...plan.limits,
      ...customLimits
    };

    // Calculate usage percentages
    const memberPercent = Math.min(
      100,
      Math.round((usage.members / (effectiveLimits.max_members || 1)) * 100)
    );
    const projectPercent = Math.min(
      100,
      Math.round((usage.projects / (effectiveLimits.max_projects || 1)) * 100)
    );
    const taskPercent = Math.min(
      100,
      Math.round((usage.tasks / (effectiveLimits.max_tasks || 1)) * 100)
    );
    const storagePercent = Math.min(
      100,
      +((usage.storage_gb / (effectiveLimits.storage_gb || 1)) * 100).toFixed(2)
    );

    const isMemberLimitReached = usage.members >= effectiveLimits.max_members;
    const isProjectLimitReached = usage.projects >= effectiveLimits.max_projects;
    const isTaskLimitReached = usage.tasks >= effectiveLimits.max_tasks;

    const history = subSettings.history || [
      {
        id: 'hist-init-001',
        date: org.created_at || new Date().toISOString(),
        action: 'subscription_initialized',
        from_tier: null,
        to_tier: tier,
        billing_cycle: billingCycle,
        amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        currency: plan.currency,
        status: 'simulated_active',
        invoice_number: `INV-${(org.slug || 'ops').slice(0, 3).toUpperCase()}-001`,
        notes: `Simulated subscription billing initialized for ${org.name}`
      }
    ];

    return {
      organization_id: org.id,
      organization_name: org.name,
      tier,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency,
        features: plan.features
      },
      status,
      billing_cycle: billingCycle,
      is_trial: isTrial,
      trial_ends_at: trialEndsAt,
      days_left_in_trial: daysLeftInTrial,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subSettings.cancel_at_period_end),
      limits: effectiveLimits,
      usage: {
        ...usage,
        percentages: {
          members: memberPercent,
          projects: projectPercent,
          tasks: taskPercent,
          storage: storagePercent
        },
        is_member_limit_reached: isMemberLimitReached,
        is_project_limit_reached: isProjectLimitReached,
        is_task_limit_reached: isTaskLimitReached
      },
      history,
      simulated_billing: {
        is_mock_billing: true,
        disclaimer:
          'MVP Simulated Billing: Recurring charges are simulated. No live credit card is debited.',
        payment_method: subSettings.payment_method || 'Simulated Visa •••• 4242'
      }
    };
  }

  /**
   * Enforce Subscription Resource Limit on Backend
   * Throws 403 SUBSCRIPTION_LIMIT_EXCEEDED when resource limit is reached.
   */
  async checkResourceLimit(orgId, resourceType) {
    const sub = await this.getOrganizationSubscription(orgId);
    const { limits, usage, tier, plan } = sub;

    if (resourceType === 'members') {
      if (usage.members >= limits.max_members) {
        const err = new Error(
          `Subscription Limit Exceeded: Your current ${plan.name} allows a maximum of ${limits.max_members} team members. You currently have ${usage.members} active members. Upgrade your subscription to add or invite more team members.`
        );
        err.status = 403;
        err.code = 'SUBSCRIPTION_LIMIT_EXCEEDED';
        err.details = {
          resource: 'members',
          current: usage.members,
          limit: limits.max_members,
          tier
        };
        throw err;
      }
    } else if (resourceType === 'projects') {
      if (usage.projects >= limits.max_projects) {
        const err = new Error(
          `Subscription Limit Exceeded: Your current ${plan.name} allows a maximum of ${limits.max_projects} active projects. You currently have ${usage.projects} active projects. Upgrade your subscription to create additional projects.`
        );
        err.status = 403;
        err.code = 'SUBSCRIPTION_LIMIT_EXCEEDED';
        err.details = {
          resource: 'projects',
          current: usage.projects,
          limit: limits.max_projects,
          tier
        };
        throw err;
      }
    } else if (resourceType === 'tasks') {
      if (usage.tasks >= limits.max_tasks) {
        const err = new Error(
          `Subscription Limit Exceeded: Your current ${plan.name} allows a maximum of ${limits.max_tasks} active tasks. Upgrade your subscription to create more tasks.`
        );
        err.status = 403;
        err.code = 'SUBSCRIPTION_LIMIT_EXCEEDED';
        err.details = {
          resource: 'tasks',
          current: usage.tasks,
          limit: limits.max_tasks,
          tier
        };
        throw err;
      }
    }
  }

  /**
   * Upgrade Subscription Plan (Simulated Billing State)
   */
  async upgradeSubscription(
    orgId,
    { targetTier, billingCycle = 'monthly', simulatedPaymentMethod = 'Simulated Visa •••• 4242', notes },
    userId
  ) {
    const targetPlan = getSubscriptionPlan(targetTier);
    const currentSub = await this.getOrganizationSubscription(orgId);
    const fromTier = currentSub.tier;

    const amount =
      billingCycle === 'yearly' ? targetPlan.price_yearly : targetPlan.price_monthly;
    const invoiceNum = `INV-UPG-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    const periodEndIso = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    const historyEntry = {
      id: `hist-${crypto.randomUUID()}`,
      date: nowIso,
      action: 'plan_upgraded',
      from_tier: fromTier,
      to_tier: targetTier,
      billing_cycle: billingCycle,
      amount,
      currency: targetPlan.currency,
      status: 'simulated_paid',
      invoice_number: invoiceNum,
      payment_method: simulatedPaymentMethod,
      initiated_by: userId,
      notes: notes || `Upgraded from ${fromTier} to ${targetPlan.name} (${billingCycle})`
    };

    const updatedSettingsSubscription = {
      ...(currentSub.settings?.subscription || {}),
      plan_tier: targetTier,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: nowIso,
      current_period_end: periodEndIso,
      cancel_at_period_end: false,
      trial_ends_at: null,
      payment_method: simulatedPaymentMethod,
      history: [historyEntry, ...(currentSub.history || [])]
    };

    await this._persistSubscriptionUpdates(orgId, targetTier, updatedSettingsSubscription);

    logger.info(
      `Organization ${orgId} upgraded subscription from ${fromTier} to ${targetTier} (${billingCycle}). Invoice: ${invoiceNum}`
    );

    return {
      message: `Successfully upgraded to ${targetPlan.name}`,
      subscription: await this.getOrganizationSubscription(orgId),
      simulated_invoice: {
        invoice_number: invoiceNum,
        amount,
        currency: targetPlan.currency,
        billing_cycle: billingCycle,
        status: 'simulated_paid',
        date: nowIso
      }
    };
  }

  /**
   * Downgrade Subscription Plan with Resource Utilization Safety Guard
   */
  async downgradeSubscription(orgId, { targetTier, billingCycle = 'monthly', reason }, userId) {
    const targetPlan = getSubscriptionPlan(targetTier);
    const currentSub = await this.getOrganizationSubscription(orgId);
    const fromTier = currentSub.tier;
    const usage = currentSub.usage;

    // Safety Invariant 1: Member count must not exceed target tier maximum
    if (usage.members > targetPlan.limits.max_members) {
      const err = new Error(
        `Cannot downgrade to ${targetPlan.name}: Your organization currently has ${usage.members} active members, which exceeds the ${targetPlan.limits.max_members} member limit of the ${targetPlan.name}. Please remove members before downgrading.`
      );
      err.status = 400;
      err.code = 'DOWNGRADE_USAGE_EXCEEDED';
      err.details = {
        resource: 'members',
        current: usage.members,
        targetLimit: targetPlan.limits.max_members,
        excess: usage.members - targetPlan.limits.max_members
      };
      throw err;
    }

    // Safety Invariant 2: Project count must not exceed target tier maximum
    if (usage.projects > targetPlan.limits.max_projects) {
      const err = new Error(
        `Cannot downgrade to ${targetPlan.name}: Your organization currently has ${usage.projects} active projects, which exceeds the ${targetPlan.limits.max_projects} project limit of the ${targetPlan.name}. Please archive projects before downgrading.`
      );
      err.status = 400;
      err.code = 'DOWNGRADE_USAGE_EXCEEDED';
      err.details = {
        resource: 'projects',
        current: usage.projects,
        targetLimit: targetPlan.limits.max_projects,
        excess: usage.projects - targetPlan.limits.max_projects
      };
      throw err;
    }

    const amount =
      billingCycle === 'yearly' ? targetPlan.price_yearly : targetPlan.price_monthly;
    const invoiceNum = `INV-DWN-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    const periodEndIso = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    const historyEntry = {
      id: `hist-${crypto.randomUUID()}`,
      date: nowIso,
      action: 'plan_downgraded',
      from_tier: fromTier,
      to_tier: targetTier,
      billing_cycle: billingCycle,
      amount,
      currency: targetPlan.currency,
      status: 'simulated_active',
      invoice_number: invoiceNum,
      initiated_by: userId,
      notes: reason || `Downgraded from ${fromTier} to ${targetPlan.name}`
    };

    const updatedSettingsSubscription = {
      ...(currentSub.settings?.subscription || {}),
      plan_tier: targetTier,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: nowIso,
      current_period_end: periodEndIso,
      cancel_at_period_end: false,
      history: [historyEntry, ...(currentSub.history || [])]
    };

    await this._persistSubscriptionUpdates(orgId, targetTier, updatedSettingsSubscription);

    logger.info(
      `Organization ${orgId} downgraded subscription from ${fromTier} to ${targetTier}. Invoice: ${invoiceNum}`
    );

    return {
      message: `Successfully downgraded to ${targetPlan.name}`,
      subscription: await this.getOrganizationSubscription(orgId)
    };
  }

  /**
   * Cancel Subscription (Sets cancel_at_period_end)
   */
  async cancelSubscription(orgId, { reason, feedback }, userId) {
    const currentSub = await this.getOrganizationSubscription(orgId);
    const nowIso = new Date().toISOString();

    const historyEntry = {
      id: `hist-${crypto.randomUUID()}`,
      date: nowIso,
      action: 'subscription_canceled',
      from_tier: currentSub.tier,
      to_tier: currentSub.tier,
      amount: 0,
      currency: currentSub.plan.currency,
      status: 'cancel_scheduled',
      initiated_by: userId,
      notes: reason || 'Canceled by organization administrator'
    };

    const updatedSettingsSubscription = {
      ...(currentSub.settings?.subscription || {}),
      cancel_at_period_end: true,
      cancellation_reason: reason || null,
      cancellation_feedback: feedback || null,
      history: [historyEntry, ...(currentSub.history || [])]
    };

    await this._persistSubscriptionUpdates(orgId, currentSub.tier, updatedSettingsSubscription);

    return {
      message:
        'Subscription cancellation scheduled. Access remains active until the end of your billing cycle.',
      subscription: await this.getOrganizationSubscription(orgId)
    };
  }

  /**
   * Reactivate Subscription
   */
  async reactivateSubscription(orgId, userId) {
    const currentSub = await this.getOrganizationSubscription(orgId);
    const nowIso = new Date().toISOString();

    const historyEntry = {
      id: `hist-${crypto.randomUUID()}`,
      date: nowIso,
      action: 'subscription_reactivated',
      from_tier: currentSub.tier,
      to_tier: currentSub.tier,
      amount: 0,
      currency: currentSub.plan.currency,
      status: 'active',
      initiated_by: userId,
      notes: 'Subscription reactivated by administrator'
    };

    const updatedSettingsSubscription = {
      ...(currentSub.settings?.subscription || {}),
      status: 'active',
      cancel_at_period_end: false,
      history: [historyEntry, ...(currentSub.history || [])]
    };

    await this._persistSubscriptionUpdates(orgId, currentSub.tier, updatedSettingsSubscription);

    return {
      message: 'Subscription successfully reactivated.',
      subscription: await this.getOrganizationSubscription(orgId)
    };
  }

  /**
   * Super Admin: Retrieve All Organization Subscriptions Cross-Tenant
   */
  async getAllSubscriptions({ page = 1, limit = 50, status, search } = {}) {
    let orgs = [];

    if (env.isMockMode || !supabaseAdmin) {
      orgs = mockDatabase.organizations || [];
    } else {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      orgs = data || [];
    }

    const subscriptions = await Promise.all(
      orgs.map(async (org) => {
        try {
          return await this.getOrganizationSubscription(org.id);
        } catch {
          return null;
        }
      })
    );

    let filtered = subscriptions.filter(Boolean);

    if (status) {
      filtered = filtered.filter((s) => s.status === status);
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.organization_name.toLowerCase().includes(query) ||
          s.tier.toLowerCase().includes(query)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Super Admin: Retrieve Platform-Wide Subscription Metrics & Revenue Telemetry
   */
  async getPlatformMetrics() {
    const { data: subscriptions } = await this.getAllSubscriptions({ limit: 1000 });

    let totalMrr = 0;
    const byTier = { starter: 0, growth: 0, enterprise: 0 };
    const byStatus = { active: 0, trialing: 0, past_due: 0, canceled: 0, paused: 0 };
    let totalSeatsUtilized = 0;
    let totalSeatsCapacity = 0;

    for (const sub of subscriptions) {
      const plan = sub.plan;
      const rate =
        sub.billing_cycle === 'yearly'
          ? Math.round(plan.price_yearly / 12)
          : plan.price_monthly;

      if (sub.status === 'active') {
        totalMrr += rate;
      }

      byTier[sub.tier] = (byTier[sub.tier] || 0) + 1;
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;

      totalSeatsUtilized += sub.usage.members || 0;
      totalSeatsCapacity += sub.limits.max_members || 0;
    }

    return {
      total_organizations: subscriptions.length,
      monthly_recurring_revenue: totalMrr,
      annual_run_rate: totalMrr * 12,
      subscribers_by_tier: byTier,
      subscribers_by_status: byStatus,
      seat_metrics: {
        utilized: totalSeatsUtilized,
        capacity: totalSeatsCapacity,
        utilization_rate: totalSeatsCapacity > 0 ? +((totalSeatsUtilized / totalSeatsCapacity) * 100).toFixed(1) : 0
      }
    };
  }

  /**
   * Super Admin: Override an Organization Subscription
   */
  async superAdminOverride(
    orgId,
    { tier, status, billingCycle, extendTrialDays, customLimits, notes },
    adminUserId
  ) {
    const currentSub = await this.getOrganizationSubscription(orgId);
    const targetTier = tier || currentSub.tier;
    const targetStatus = status || currentSub.status;
    const targetCycle = billingCycle || currentSub.billing_cycle;

    let updatedTrialEndsAt = currentSub.trial_ends_at;
    if (extendTrialDays) {
      const baseDate = currentSub.trial_ends_at
        ? new Date(currentSub.trial_ends_at)
        : new Date();
      updatedTrialEndsAt = new Date(
        baseDate.getTime() + extendTrialDays * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const historyEntry = {
      id: `hist-${crypto.randomUUID()}`,
      date: new Date().toISOString(),
      action: 'superadmin_override',
      from_tier: currentSub.tier,
      to_tier: targetTier,
      billing_cycle: targetCycle,
      amount: 0,
      currency: 'USD',
      status: targetStatus,
      initiated_by: adminUserId,
      notes: notes || 'Platform Super Admin override applied'
    };

    const updatedSettingsSubscription = {
      ...(currentSub.settings?.subscription || {}),
      plan_tier: targetTier,
      status: targetStatus,
      billing_cycle: targetCycle,
      trial_ends_at: updatedTrialEndsAt,
      custom_limits: {
        ...(currentSub.limits || {}),
        ...(customLimits || {})
      },
      history: [historyEntry, ...(currentSub.history || [])]
    };

    await this._persistSubscriptionUpdates(orgId, targetTier, updatedSettingsSubscription);

    logger.info(
      `Super Admin ${adminUserId} applied subscription override to Organization ${orgId}: Tier=${targetTier}, Status=${targetStatus}`
    );

    return {
      message: 'Super Admin override successfully applied',
      subscription: await this.getOrganizationSubscription(orgId)
    };
  }

  /**
   * Super Admin: Update Plan Pricing or Feature Entitlements
   */
  async updatePlanDefinition(tier, updates, adminUserId) {
    const updatedPlan = updateSubscriptionPlan(tier, updates);
    logger.info(`Super Admin ${adminUserId} updated plan definition for '${tier}'`);
    return updatedPlan;
  }

  /**
   * Internal helper: persist subscription tier and settings.subscription in DB
   */
  async _persistSubscriptionUpdates(orgId, targetTier, subscriptionSettings) {
    if (env.isMockMode || !supabaseAdmin) {
      const idx = (mockDatabase.organizations || []).findIndex(
        (o) => o.id === orgId || o.slug === orgId
      );
      if (idx !== -1) {
        mockDatabase.organizations[idx].subscription_tier = targetTier;
        if (!mockDatabase.organizations[idx].settings) {
          mockDatabase.organizations[idx].settings = {};
        }
        mockDatabase.organizations[idx].settings.subscription = subscriptionSettings;
        mockDatabase.organizations[idx].updated_at = new Date().toISOString();
      }
      return;
    }

    // In Supabase, update both column subscription_tier and jsonb settings.subscription
    const { data: currentOrg } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    const mergedSettings = {
      ...(currentOrg?.settings || {}),
      subscription: subscriptionSettings
    };

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        subscription_tier: targetTier,
        settings: mergedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (error) throw error;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
