import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Service Request and Work Order Lifecycle (Prompt 22)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const _ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Admin / Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Operations Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee / Technician (w1)
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer (Metro Health)
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Admin / Manager

  let createdRequestId = null;
  let createdWorkOrderId = null;
  let createdChecklistItemId = null;

  // =========================================================================
  // 1. Service Request Lifecycle: Submission, Review, Approval, Rejection
  // =========================================================================

  await t.test('1.1 Customer or Manager submits a new service request', async () => {
    const payload = {
      title: 'Automated Loading Bay 4 Conveyor Bearing Failure',
      description: 'Severe grinding noise and vibration detected on primary conveyor drive motor.',
      location: 'Distribution Bay 4 South',
      service_type: 'repair',
      urgency: 'high',
      estimated_cost: 1200,
      attachments: [
        {
          name: 'bearing_thermal_scan.pdf',
          url: 'https://storage.opspilot.internal/vault/bearing_thermal_scan.pdf',
          file_size: 154000,
          type: 'application/pdf'
        }
      ]
    };

    const res = await request(app)
      .post('/api/service-requests')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.request_code.startsWith('SR-'));
    assert.equal(res.body.data.status, 'new');
    assert.equal(res.body.data.attachments.length, 1);
    assert.ok(Array.isArray(res.body.data.status_history));

    createdRequestId = res.body.data.id;
  });

  await t.test(
    '1.2 Rejects service request creation when title is missing or too short',
    async () => {
      const res = await request(app)
        .post('/api/service-requests')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ title: 'No' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    }
  );

  await t.test(
    '1.3 Retrieves paginated service requests with category & status filters',
    async () => {
      const res = await request(app)
        .get('/api/service-requests?service_type=repair&status=new')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((r) => r.id === createdRequestId));
    }
  );

  await t.test('1.4 Manager moves service request to "in_review"', async () => {
    const res = await request(app)
      .post(`/api/service-requests/${createdRequestId}/review`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ manager_notes: 'Checking parts availability for Bay 4 conveyor bearing.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'in_review');
    assert.equal(
      res.body.data.manager_notes,
      'Checking parts availability for Bay 4 conveyor bearing.'
    );
  });

  await t.test('1.5 Manager approves service request for work order generation', async () => {
    const res = await request(app)
      .post(`/api/service-requests/${createdRequestId}/approve`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        manager_notes: 'OEM bearing sourced from warehouse. Approved for technician dispatch.'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'approved');
    assert.ok(res.body.data.approved_at);
  });

  await t.test(
    '1.6 Enforces state machine: Disallows rejecting an already approved request',
    async () => {
      const res = await request(app)
        .post(`/api/service-requests/${createdRequestId}/reject`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ rejection_reason: 'Should fail because request is already approved' });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.message.includes('Invalid service request status transition'));
    }
  );

  await t.test(
    '1.7 Rejection workflow: Creates separate request and rejects with reason',
    async () => {
      const createRes = await request(app)
        .post('/api/service-requests')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          title: 'Non-contract exterior window washing',
          service_type: 'maintenance',
          urgency: 'low'
        });

      const rejectId = createRes.body.data.id;

      const rejectRes = await request(app)
        .post(`/api/service-requests/${rejectId}/reject`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          rejection_reason:
            'Facility exterior window cleaning is out of SLA service contract scope.'
        });

      assert.equal(rejectRes.status, 200);
      assert.equal(rejectRes.body.data.status, 'rejected');
      assert.equal(
        rejectRes.body.data.rejection_reason,
        'Facility exterior window cleaning is out of SLA service contract scope.'
      );
    }
  );

  await t.test('1.8 Adds attachment to service request', async () => {
    const res = await request(app)
      .post(`/api/service-requests/${createdRequestId}/attachments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        name: 'vibration_analysis_report.pdf',
        url: 'https://storage.opspilot.internal/vault/vibration_analysis_report.pdf',
        file_size: 320000,
        type: 'application/pdf'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
  });

  // =========================================================================
  // 2. Work Order Lifecycle: Generation, Scheduling, Checklists, Completion & Closure
  // =========================================================================

  await t.test('2.1 Generates Work Order from approved service request', async () => {
    const payload = {
      assigned_to: 'w1', // David Miller
      scheduled_start: '2026-11-06T09:00:00Z',
      scheduled_end: '2026-11-06T13:00:00Z',
      initial_checklist: [
        'Perform electrical lockout-tagout on Bay 4 drive panel',
        'Remove conveyor motor coupling guards',
        'Extract failed bearing assembly and measure shaft tolerance',
        'Press-fit OEM replacement bearing with lithium grease',
        'Reassemble guards and perform 15-minute operational vibration test'
      ]
    };

    const res = await request(app)
      .post(`/api/service-requests/${createdRequestId}/convert-to-work-order`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.serviceRequest.status, 'converted');
    assert.ok(res.body.data.workOrder.id);
    assert.ok(res.body.data.workOrder.work_order_code.startsWith('WO-'));
    assert.equal(res.body.data.workOrder.service_request_id, createdRequestId);
    assert.equal(res.body.data.workOrder.assigned_to, 'w1');
    assert.equal(res.body.data.workOrder.assigned_technician, 'David Miller');
    assert.equal(res.body.data.workOrder.checklists.length, 5);

    createdWorkOrderId = res.body.data.workOrder.id;
    createdChecklistItemId = res.body.data.workOrder.checklists[0].id;
  });

  await t.test('2.2 Cannot convert service request a second time', async () => {
    const res = await request(app)
      .post(`/api/service-requests/${createdRequestId}/convert-to-work-order`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({});

    assert.equal(res.status, 400);
    assert.ok(res.body.error.message.includes('Cannot generate work order'));
  });

  await t.test(
    '2.3 Direct work order creation by Operations Manager without service request',
    async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          title: 'Quarterly Air Compressor Air Filter Replacements',
          site: 'Central Utility Plant',
          priority: 'normal',
          cost_estimate: 450,
          checklists: ['Inspect oil level', 'Replace dual particulate intake filters']
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.service_request_id, null);
    }
  );

  await t.test(
    '2.4 Work order listing retrieves active jobs with status & priority filters',
    async () => {
      const res = await request(app)
        .get('/api/work-orders?priority=high')
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((wo) => wo.id === createdWorkOrderId));
    }
  );

  await t.test('2.5 Retrieves work order details with checklists and status history', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${createdWorkOrderId}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdWorkOrderId);
    assert.ok(Array.isArray(res.body.data.checklists));
    assert.ok(Array.isArray(res.body.data.status_history));
  });

  await t.test('2.6 Technician assignment updates assigned tech and records history', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/assign`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        assigned_to: 'w1',
        scheduled_start: '2026-11-06T10:00:00Z',
        scheduled_end: '2026-11-06T14:00:00Z',
        scheduled_window: 'Today 10:00 - 14:00'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.assigned_to, 'w1');
    assert.equal(res.body.data.assigned_technician, 'David Miller');
  });

  await t.test('2.7 Checklist workflow: Adds new item and auto-calculates progress', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/checklists`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ item_text: 'Inspect conveyor belt tension after reassembly' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.item_text, 'Inspect conveyor belt tension after reassembly');
    assert.equal(res.body.data.is_completed, false);
  });

  await t.test(
    '2.8 Checklist workflow: Toggles item as completed and verifies progress advancement',
    async () => {
      const res = await request(app)
        .patch(`/api/work-orders/${createdWorkOrderId}/checklists/${createdChecklistItemId}`)
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ is_completed: true });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.is_completed, true);
      assert.ok(res.body.data.completed_at);

      // Verify parent work order progress recalculated
      const woRes = await request(app)
        .get(`/api/work-orders/${createdWorkOrderId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.ok(woRes.body.data.progress > 0);
    }
  );

  await t.test('2.9 Technician records job notes', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/notes`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        note: 'Drive shaft has 0.02mm wear. Cleaned and prepared with anti-seize paste.',
        is_internal: false
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.author_name, 'David Miller');
  });

  await t.test('2.10 Uploads before-and-after photographs', async () => {
    const beforeRes = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/photos`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        type: 'before',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        caption: 'Damaged bearing casing before replacement'
      });

    assert.equal(beforeRes.status, 201);
    assert.equal(beforeRes.body.success, true);

    const afterRes = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/photos`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        type: 'after',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800',
        caption: 'New SKF spherical bearing installed and torqued to specification'
      });

    assert.equal(afterRes.status, 201);
    assert.equal(afterRes.body.success, true);

    const detailRes = await request(app)
      .get(`/api/work-orders/${createdWorkOrderId}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(detailRes.body.data.before_photos.length, 1);
    assert.equal(detailRes.body.data.after_photos.length, 1);
  });

  await t.test('2.11 State machine: Advances status to "in_progress"', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ status: 'in_progress', reason: 'Technician arrived and began disassembly' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in_progress');
  });

  await t.test('2.12 State machine guard: Disallows invalid jump to "closed"', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ status: 'closed', reason: 'Premature closing attempt' });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.message.includes('Invalid work order status transition'));
  });

  await t.test('2.13 Records completion details and sets status to "completed"', async () => {
    const completionPayload = {
      completion_notes:
        'SKF spherical roller bearing installed. 15-minute test run showed zero vibration.',
      actual_cost: 1140.0,
      labor_hours: 3.5,
      parts_used: [
        {
          item_id: 'part-skf-222',
          name: 'SKF 22212 Spherical Roller Bearing',
          quantity: 1,
          cost: 420.0
        },
        {
          item_id: 'part-grease-01',
          name: 'Mobil SHC High-Temp Synthetic Grease',
          quantity: 1,
          cost: 45.0
        }
      ]
    };

    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/complete`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(completionPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'completed');
    assert.equal(res.body.data.progress, 100);
    assert.equal(res.body.data.actual_cost, 1140.0);
  });

  await t.test('2.14 Customer confirms work order with signature and 5-star review', async () => {
    const confirmPayload = {
      customer_signature_url: 'data:image/svg+xml;utf8,<svg>Rachel Green Signature</svg>',
      rating: 5,
      feedback: 'Excellent response time. The conveyor is running smoothly with no noise.'
    };

    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/confirm`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(confirmPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.customer_confirmation);
    assert.equal(res.body.data.customer_confirmation.rating, 5);
  });

  await t.test(
    '2.15 Manager closes work order and verifies linked service request closes automatically',
    async () => {
      const res = await request(app)
        .post(`/api/work-orders/${createdWorkOrderId}/close`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ closing_notes: 'Quality checked, customer confirmed, and invoices queued.' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'closed');
      assert.ok(res.body.data.closed_at);

      // Verify cascading closure: Linked service request must now also be closed!
      const srRes = await request(app)
        .get(`/api/service-requests/${createdRequestId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(srRes.status, 200);
      assert.equal(srRes.body.data.status, 'closed');
    }
  );

  // =========================================================================
  // 3. Security, Tenant Isolation & Authorization Controls
  // =========================================================================

  await t.test(
    '3.1 Cross-Tenant Isolation: Apex user cannot view Acme service requests or work orders',
    async () => {
      const srRes = await request(app)
        .get(`/api/service-requests/${createdRequestId}`)
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(srRes.status, 403);
      assert.equal(srRes.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');

      const woRes = await request(app)
        .get(`/api/work-orders/${createdWorkOrderId}`)
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(woRes.status, 403);
      assert.equal(woRes.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );

  await t.test('3.2 Cross-Tenant Isolation: Apex user cannot mutate Acme work order', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${createdWorkOrderId}/notes`)
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID)
      .send({ note: 'Intrusion note attempt' });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
  });

  await t.test('3.3 Role Boundary: Employee cannot delete work order (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/work-orders/${createdWorkOrderId}`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 403);
  });

  await t.test(
    '3.4 Customer Account Isolation: Customer cannot close work order (403 Forbidden)',
    async () => {
      const res = await request(app)
        .post(`/api/work-orders/${createdWorkOrderId}/close`)
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ closing_notes: 'Unauthorized closure attempt' });

      assert.equal(res.status, 403);
    }
  );
});
