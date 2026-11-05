import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: CRM, Customer Portal, and Service Request Journey', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner / Admin
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer (Metro Health System)

  let createdCustomerId = null;
  let createdCustomerNoteId = null;
  let submittedServiceRequestId = null;

  // =========================================================
  // 1. CRM: Customer Directory & Profile Management (Staff API)
  // =========================================================

  await t.test('1.1 Allows Manager/Admin to register a new client profile in CRM', async () => {
    const payload = {
      name: 'OmniCorp Logistics Hub',
      company_name: 'OmniCorp Global Supply Chain Inc.',
      email: `contact.${Date.now()}@omnicorp.com`,
      phone: '+1 (555) 888-9900',
      sla_tier: 'platinum',
      status: 'active',
      lead_status: 'prospect',
      follow_up_date: '2026-11-25',
      follow_up_notes: 'Demonstrate automated dock telemetry solution',
      address: {
        street: '1200 Innovation Parkway, Dock 4',
        city: 'Atlanta',
        state: 'GA',
        postal_code: '30301',
        country: 'USA'
      }
    };

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.customer_code.startsWith('CUST-'));
    assert.equal(res.body.data.sla_tier, 'platinum');
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);

    createdCustomerId = res.body.data.id;
  });

  await t.test('1.2 Rejects customer creation with invalid email or missing name', async () => {
    const invalidPayload = {
      name: 'X', // min 2 chars
      email: 'not-an-email'
    };

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('1.3 Customer directory list returns paginated records with filters', async () => {
    const res = await request(app)
      .get('/api/customers?page=1&limit=10&status=active')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((c) => c.status === 'active'));
  });

  await t.test('1.4 Retrieves customer profile by ID with contact details', async () => {
    const res = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdCustomerId);
    assert.equal(res.body.data.sla_tier, 'platinum');
  });

  await t.test('1.5 Updates customer details and contact information', async () => {
    const res = await request(app)
      .patch(`/api/customers/${createdCustomerId}`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        phone: '+1 (555) 777-6655',
        sla_tier: 'critical'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.phone, '+1 (555) 777-6655');
    assert.equal(res.body.data.sla_tier, 'critical');
  });

  // =========================================================
  // 2. CRM: Notes, History, and Follow-Up Management
  // =========================================================

  await t.test('2.1 Adds an internal note to customer profile', async () => {
    const res = await request(app)
      .post(`/api/customers/${createdCustomerId}/notes`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        note: 'Customer requested telemetry dashboard integration for loading bay refrigeration units.'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.customer_id, createdCustomerId);

    createdCustomerNoteId = res.body.data.id;
    assert.ok(createdCustomerNoteId);
  });

  await t.test('2.2 Retrieves internal notes thread for customer', async () => {
    const res = await request(app)
      .get(`/api/customers/${createdCustomerId}/notes`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.some((n) => n.id === createdCustomerNoteId));
  });

  await t.test('2.3 Updates lead status stage and schedules follow-up', async () => {
    const res = await request(app)
      .patch(`/api/customers/${createdCustomerId}/follow-up`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        lead_status: 'active',
        follow_up_date: '2026-12-01',
        follow_up_notes: 'Finalize annual preventive maintenance agreement'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.lead_status, 'active');
    assert.equal(res.body.data.follow_up_date, '2026-12-01');
  });

  await t.test('2.4 Retrieves customer transaction & service history log', async () => {
    const res = await request(app)
      .get('/api/customers/cust-acme-1/history')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  // =========================================================
  // 3. Customer Portal: Profile, Self-Service & Anti-IDOR
  // =========================================================

  await t.test('3.1 Customer accesses portal overview dashboard', async () => {
    const res = await request(app)
      .get('/api/customer/portal')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.customer);
    assert.ok(res.body.data.organization);
    assert.ok(Array.isArray(res.body.data.serviceRequests));
    assert.ok(res.body.data.stats);
  });

  await t.test('3.2 Customer retrieves own profile details', async () => {
    const res = await request(app)
      .get('/api/customer/profile')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'rachel.green@metrohealth.com');
  });

  await t.test('3.3 Customer updates own contact info and facility address', async () => {
    const res = await request(app)
      .patch('/api/customer/profile')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        phone: '+1 (555) 234-9988',
        address: '742 Evergreen Terrace, Medical Wing 2B, Metropolis, NY 10001'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.phone, '+1 (555) 234-9988');
  });

  // =========================================================
  // 4. Customer Service Requests Journey & Status Tracking
  // =========================================================

  await t.test('4.1 Customer submits a new service request with Zod validation', async () => {
    const payload = {
      title: 'Emergency Cryocooler Pressure Drop in Bay 4',
      description: 'Secondary helium chiller pressure fluctuated below 18 PSI on unit MRI-3.',
      location: 'Main Medical Tower - Radiology Suite 4',
      urgency: 'critical',
      service_type: 'repair'
    };

    const res = await request(app)
      .post('/api/customer/service-requests')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.request_code.startsWith('SR-'));
    assert.equal(res.body.data.urgency, 'critical');
    assert.equal(res.body.data.customer_id, 'cust-acme-1');

    submittedServiceRequestId = res.body.data.id;
  });

  await t.test('4.2 Rejects customer service request with missing fields (400)', async () => {
    const invalidPayload = {
      title: '', // Missing title
      description: 'Too short', // Min 5 characters
      location: ''
    };

    const res = await request(app)
      .post('/api/customer/service-requests')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('4.3 Customer lists own service requests', async () => {
    const res = await request(app)
      .get('/api/customer/service-requests')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((r) => r.id === submittedServiceRequestId));
  });

  await t.test(
    '4.4 Customer tracks service status timeline on specific request (5-step progress)',
    async () => {
      const res = await request(app)
        .get(`/api/customer/service-requests/${submittedServiceRequestId}`)
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.timeline);
      assert.equal(res.body.data.timeline.length, 5);
      assert.equal(res.body.data.timeline[0].completed, true);
    }
  );

  await t.test('4.5 Customer submits satisfaction feedback and star rating', async () => {
    const feedbackPayload = {
      rating: 5,
      comments: 'Technician was on site within 30 minutes. Excellent communication and resolution!'
    };

    const res = await request(app)
      .post(`/api/customer/service-requests/${submittedServiceRequestId}/feedback`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(feedbackPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.rating, 5);
  });

  await t.test('4.6 Rejects invalid feedback rating outside 1-5 boundary', async () => {
    const invalidFeedback = {
      rating: 10 // Valid range: 1 to 5
    };

    const res = await request(app)
      .post(`/api/customer/service-requests/${submittedServiceRequestId}/feedback`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidFeedback);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // =========================================================
  // 5. Customer Permitted Projects & Invoices
  // =========================================================

  await t.test(
    '5.1 Customer retrieves permitted project updates without leaking internal profit/rate data',
    async () => {
      const res = await request(app)
        .get('/api/customer/projects')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));

      // Verifies internal financial figures and rates are NOT exposed in customer projection
      res.body.data.forEach((p) => {
        assert.equal(p.budget, undefined, 'Project budget must be redacted for customers');
        assert.equal(p.spent, undefined, 'Project spent must be redacted for customers');
        assert.ok(p.name);
        assert.ok(p.status);
      });
    }
  );

  await t.test('5.2 Customer retrieves billing invoices', async () => {
    const res = await request(app)
      .get('/api/customer/invoices')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  await t.test('5.3 Customer retrieves invoice detail with itemized line items', async () => {
    const res = await request(app)
      .get('/api/customer/invoices/inv-1')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 'inv-1');
    assert.ok(Array.isArray(res.body.data.items));
  });

  // =========================================================
  // 6. Security Boundaries & IDOR Prevention
  // =========================================================

  await t.test(
    '6.1 Customer is blocked from accessing internal workforce directory (403 Forbidden)',
    async () => {
      const res = await request(app)
        .get('/api/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
    }
  );

  await t.test(
    '6.2 Anti-IDOR: Customer cannot view service requests belonging to another customer',
    async () => {
      // sr-3 belongs to cust-acme-2 (Pacific Freight), not Rachel (Metro Health)
      const res = await request(app)
        .get('/api/customer/service-requests/sr-3')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
    }
  );

  await t.test(
    '6.3 Anti-IDOR: Customer cannot submit feedback on another customer service request',
    async () => {
      const res = await request(app)
        .post('/api/customer/service-requests/sr-3/feedback')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ rating: 4, comments: 'Intrusion attempt' });

      assert.equal(res.status, 403);
    }
  );

  await t.test(
    '6.4 Anti-IDOR: Customer cannot view invoices belonging to another customer/tenant',
    async () => {
      // inv-4 belongs to another customer (Pacific Freight) within Acme
      const resIdor = await request(app)
        .get('/api/customer/invoices/inv-4')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(resIdor.status, 403);

      // inv-2 belongs to another tenant (Apex)
      const resCrossTenant = await request(app)
        .get('/api/customer/invoices/inv-2')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(resCrossTenant.status, 404);
    }
  );

  await t.test(
    '6.5 Customer is blocked from accessing staff-only customer notes endpoint (403)',
    async () => {
      const res = await request(app)
        .get(`/api/customers/${createdCustomerId}/notes`)
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
    }
  );

  await t.test(
    '6.6 Cross-tenant boundary: Customer cannot switch tenant header to access Apex tenant (403)',
    async () => {
      const res = await request(app)
        .get('/api/customer/portal')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );
});
