import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { mockDatabase } from '../../server/src/config/supabase.js';
import { resetSubscriptionPlans } from '../../server/src/config/subscriptionPlans.js';

test('Integration Test: Organization Settings & Platform Subscription Management', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner
  const SUPERADMIN_TOKEN = 'Bearer mock-token-superadmin'; // Platform Super Admin

  // Reset mutable plan state before tests
  resetSubscriptionPlans();

  // =========================================================================
  // 1. Organization Settings, Branding & Preferences
  // =========================================================================

  await t.test('1.1 Retrieve Organization Settings with default branding and preferences', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/settings')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.branding, 'Settings must include branding object');
    assert.ok(res.body.data.preferences, 'Settings must include preferences object');
    assert.ok(res.body.data.notifications, 'Settings must include notifications object');
    assert.equal(res.body.data.preferences.currency, 'USD');
  });

  await t.test('1.2 Update Corporate Profile & Visual Branding', async () => {
    const brandingPayload = {
      branding: {
        logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=256',
        primary_color: '#3B82F6',
        accent_color: '#10B981',
        website: 'https://acme-global.com',
        contact_email: 'support@acme-global.com',
        contact_phone: '+1-555-400-9900',
        address: {
          street: '500 Madison Ave, Floor 12',
          city: 'New York',
          state: 'NY',
          postal_code: '10022',
          country: 'United States'
        }
      }
    };

    const res = await request(app)
      .patch('/api/v1/organizations/current/settings')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(brandingPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.branding.primary_color, '#3B82F6');
    assert.equal(res.body.data.branding.website, 'https://acme-global.com');
    assert.equal(res.body.data.branding.address.city, 'New York');
  });

  await t.test('1.3 Update Regional Preferences (Timezone, Locale, Currency, Fiscal Year)', async () => {
    const prefPayload = {
      preferences: {
        timezone: 'America/Chicago',
        locale: 'en-US',
        currency: 'USD',
        date_format: 'YYYY-MM-DD',
        fiscal_year_start: 4
      }
    };

    const res = await request(app)
      .patch('/api/v1/organizations/current/settings')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(prefPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.preferences.timezone, 'America/Chicago');
    assert.equal(res.body.data.timezone, 'America/Chicago', 'Top-level timezone must be synced');
    assert.equal(res.body.data.preferences.fiscal_year_start, 4);
  });

  await t.test('1.4 Update Notification Delivery Preferences and Webhook Endpoint', async () => {
    const notifPayload = {
      notifications: {
        email_alerts: true,
        sms_alerts: true,
        push_alerts: true,
        webhook_url: 'https://hooks.slack.com/services/T00/B00/X00',
        events: {
          shift_reminders: true,
          dispatch_alerts: true,
          overdue_tasks: true,
          invoice_due: true,
          expense_approvals: true,
          audit_security: true
        }
      }
    };

    const res = await request(app)
      .patch('/api/v1/organizations/current/settings')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(notifPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.notifications.webhook_url, 'https://hooks.slack.com/services/T00/B00/X00');
    assert.equal(res.body.data.notifications.events.audit_security, true);
  });

  await t.test('1.5 Non-Admin / Employee is blocked from modifying settings (403)', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/settings')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ timezone: 'Europe/Paris' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  // =========================================================================
  // 2. Subscription Plans Catalog & Current Subscription
  // =========================================================================

  await t.test('2.1 Retrieve Active Subscription Plans Catalog', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/plans')
      .set('Authorization', ALEX_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Plans must be an array');
    assert.equal(res.body.data.length, 3, 'Must have Starter, Growth, Enterprise');

    const starter = res.body.data.find((p) => p.tier === 'starter');
    assert.ok(starter, 'Starter plan must exist');
    assert.equal(starter.price_monthly, 99.0);
    assert.equal(starter.limits.max_members, 15);
    assert.equal(starter.limits.max_projects, 25);
    assert.equal(starter.trial_days, 14);

    const enterprise = res.body.data.find((p) => p.tier === 'enterprise');
    assert.ok(enterprise, 'Enterprise plan must exist');
    assert.equal(enterprise.price_monthly, 799.0);
    assert.equal(enterprise.limits.max_members, 250);
  });

  await t.test('2.2 Retrieve Current Organization Subscription with Enforced Usage & Limits', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/current')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.tier, 'enterprise');
    assert.equal(res.body.data.status, 'active');
    assert.ok(res.body.data.usage, 'Usage metrics must be present');
    assert.ok(typeof res.body.data.usage.members === 'number');
    assert.ok(typeof res.body.data.usage.projects === 'number');
    assert.ok(res.body.data.limits.max_members >= 100);
    assert.ok(res.body.data.simulated_billing.is_mock_billing, 'Simulated disclaimer must be set');
  });

  await t.test('2.3 Verification via /api/v1/organizations/current/subscription route alias', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/subscription')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);
    assert.equal(res.body.data.tier, 'enterprise');
  });

  // =========================================================================
  // 3. Subscription Upgrade Workflow (Simulated Billing State)
  // =========================================================================

  await t.test('3.1 Upgrade Apex Field Services from Starter to Growth (Simulated)', async () => {
    // 1. Temporarily place Apex in Starter tier
    const apexOrg = mockDatabase.organizations.find((o) => o.id === APEX_TENANT_ID);
    apexOrg.subscription_tier = 'starter';
    if (!apexOrg.settings) apexOrg.settings = {};
    apexOrg.settings.subscription = {
      plan_tier: 'starter',
      status: 'active',
      billing_cycle: 'monthly',
      history: []
    };

    // 2. Perform upgrade to Growth tier (Annual interval)
    const upgradeRes = await request(app)
      .post('/api/v1/subscriptions/upgrade')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        targetTier: 'growth',
        billingCycle: 'yearly',
        simulatedPaymentMethod: 'Simulated Mastercard •••• 9921',
        notes: 'Simulated upgrade to Growth tier'
      });

    assert.equal(upgradeRes.status, 200);
    assert.equal(upgradeRes.body.success, true);
    assert.equal(upgradeRes.body.data.subscription.tier, 'growth');
    assert.equal(upgradeRes.body.data.subscription.billing_cycle, 'yearly');
    assert.equal(upgradeRes.body.data.simulated_invoice.amount, 2990.0);
    assert.equal(upgradeRes.body.data.simulated_invoice.status, 'simulated_paid');

    // Verify history audit record was created
    const history = upgradeRes.body.data.subscription.history;
    assert.ok(history.length > 0);
    const latestEvent = history[0];
    assert.equal(latestEvent.action, 'plan_upgraded');
    assert.equal(latestEvent.to_tier, 'growth');
  });

  // =========================================================================
  // 4. Downgrade Safety Guard & Resource Utilization Checks
  // =========================================================================

  await t.test('4.1 Downgrade is BLOCKED if active members exceed target plan limit (DOWNGRADE_USAGE_EXCEEDED)', async () => {
    // Acme Logistics has multiple active members in mockDatabase
    // Let's create a scenario where active members count > starter plan limit (15)
    const acmeOrg = mockDatabase.organizations.find((o) => o.id === ACME_TENANT_ID);
    acmeOrg.subscription_tier = 'enterprise';

    // Seed enough mock memberships in Acme to exceed 15 members
    const existingCount = mockDatabase.memberships.filter((m) => m.organization_id === ACME_TENANT_ID).length;
    for (let i = existingCount; i < 18; i++) {
      mockDatabase.memberships.push({
        id: `mem-downgrade-test-${i}`,
        organization_id: ACME_TENANT_ID,
        user_id: `user-test-${i}`,
        role: 'employee',
        status: 'active'
      });
    }

    // Attempt to downgrade Acme to Starter (limit: 15 members)
    const res = await request(app)
      .post('/api/v1/subscriptions/downgrade')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        targetTier: 'starter',
        billingCycle: 'monthly',
        reason: 'Attempting invalid downgrade'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DOWNGRADE_USAGE_EXCEEDED');
    assert.ok(res.body.error.message.includes('exceeds the 15 member limit'));

    // Clean up added test memberships
    mockDatabase.memberships = mockDatabase.memberships.filter(
      (m) => !m.id.startsWith('mem-downgrade-test-')
    );
  });

  await t.test('4.2 Downgrade SUCCEEDS when organization usage is within target limits', async () => {
    // Apex has few members (Marcus only in mockDatabase)
    const res = await request(app)
      .post('/api/v1/subscriptions/downgrade')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        targetTier: 'starter',
        billingCycle: 'monthly',
        reason: 'Downscaling operations for winter'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subscription.tier, 'starter');
    assert.equal(res.body.data.subscription.limits.max_members, 15);
  });

  // =========================================================================
  // 5. Backend Subscription Limits Enforcement
  // =========================================================================

  await t.test('5.1 Member Invitation BLOCKED on backend when member limit reached (SUBSCRIPTION_LIMIT_EXCEEDED)', async () => {
    // Set custom limit of 1 member for Apex
    const apexOrg = mockDatabase.organizations.find((o) => o.id === APEX_TENANT_ID);
    apexOrg.settings.subscription.custom_limits = { max_members: 1 };

    // Since Marcus is already 1 active member, inviting another member must trigger 403
    const res = await request(app)
      .post('/api/v1/organizations/invitations')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        email: 'blocked.invite@apex.com',
        role: 'employee'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SUBSCRIPTION_LIMIT_EXCEEDED');
    assert.ok(res.body.error.message.includes('Subscription Limit Exceeded'));

    // Reset custom limit
    delete apexOrg.settings.subscription.custom_limits;
  });

  await t.test('5.2 Direct Member Provisioning BLOCKED when member limit reached (403)', async () => {
    const apexOrg = mockDatabase.organizations.find((o) => o.id === APEX_TENANT_ID);
    apexOrg.settings.subscription.custom_limits = { max_members: 1 };

    const res = await request(app)
      .post('/api/v1/organizations/members')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        role: 'employee'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'SUBSCRIPTION_LIMIT_EXCEEDED');

    delete apexOrg.settings.subscription.custom_limits;
  });

  await t.test('5.3 Project Creation BLOCKED on backend when project limit reached (SUBSCRIPTION_LIMIT_EXCEEDED)', async () => {
    // Set project limit of 0 for Apex
    const apexOrg = mockDatabase.organizations.find((o) => o.id === APEX_TENANT_ID);
    apexOrg.settings.subscription.custom_limits = { max_projects: 0 };

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        name: 'Over-limit Project',
        description: 'Should be blocked by subscription limit'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'SUBSCRIPTION_LIMIT_EXCEEDED');
    assert.ok(res.body.error.message.includes('projects'));

    delete apexOrg.settings.subscription.custom_limits;
  });

  // =========================================================================
  // 6. Subscription Cancellation & Reactivation Lifecycle
  // =========================================================================

  await t.test('6.1 Schedule Subscription Cancellation (cancel_at_period_end)', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/cancel')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({
        reason: 'Consolidating logistics vendors'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subscription.cancel_at_period_end, true);
  });

  await t.test('6.2 Reactivate Canceled Subscription', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/reactivate')
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subscription.cancel_at_period_end, false);
    assert.equal(res.body.data.subscription.status, 'active');
  });

  // =========================================================================
  // 7. Super Admin Controls for Plans and Organization Subscriptions
  // =========================================================================

  await t.test('7.1 Non-Superadmin blocked from Super Admin subscription routes (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/subscriptions')
      .set('Authorization', ALEX_TOKEN);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_SUPERADMIN_REQUIRED');
  });

  await t.test('7.2 Super Admin lists all platform organization subscriptions cross-tenant', async () => {
    const res = await request(app)
      .get('/api/v1/admin/subscriptions')
      .set('Authorization', SUPERADMIN_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2, 'Must include Acme and Apex');

    const acmeSub = res.body.data.find((s) => s.organization_id === ACME_TENANT_ID);
    assert.ok(acmeSub, 'Acme subscription must be present in super admin list');
  });

  await t.test('7.3 Super Admin retrieves platform-wide subscription metrics & revenue telemetry', async () => {
    const res = await request(app)
      .get('/api/v1/admin/subscriptions/metrics')
      .set('Authorization', SUPERADMIN_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.monthly_recurring_revenue === 'number');
    assert.ok(res.body.data.total_organizations >= 2);
    assert.ok(res.body.data.subscribers_by_tier.enterprise >= 1);
  });

  await t.test('7.4 Super Admin overrides organization subscription (Tier, Trial Extension, Custom Seats)', async () => {
    const overridePayload = {
      tier: 'enterprise',
      status: 'active',
      extendTrialDays: 14,
      customLimits: {
        max_members: 500,
        max_projects: 2000
      },
      notes: 'Strategic enterprise partnership override granted by executive committee'
    };

    const res = await request(app)
      .patch(`/api/v1/admin/subscriptions/organizations/${APEX_TENANT_ID}/override`)
      .set('Authorization', SUPERADMIN_TOKEN)
      .send(overridePayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subscription.tier, 'enterprise');
    assert.equal(res.body.data.subscription.limits.max_members, 500);
    assert.equal(res.body.data.subscription.limits.max_projects, 2000);

    // Verify override event recorded in subscription history
    const history = res.body.data.subscription.history;
    const overrideEvent = history.find((h) => h.action === 'superadmin_override');
    assert.ok(overrideEvent, 'Audit history must record superadmin_override');
  });

  await t.test('7.5 Super Admin configures plan pricing and default limits', async () => {
    const planUpdatePayload = {
      price_monthly: 119.0,
      limits: {
        max_members: 20,
        max_projects: 30
      }
    };

    const res = await request(app)
      .put('/api/v1/admin/subscriptions/plans/starter')
      .set('Authorization', SUPERADMIN_TOKEN)
      .send(planUpdatePayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.price_monthly, 119.0);
    assert.equal(res.body.data.limits.max_members, 20);

    // Verify public plans reflect updated price
    const plansRes = await request(app).get('/api/v1/subscriptions/plans');
    const updatedStarter = plansRes.body.data.find((p) => p.tier === 'starter');
    assert.equal(updatedStarter.price_monthly, 119.0);
    assert.equal(updatedStarter.limits.max_members, 20);
  });
});
