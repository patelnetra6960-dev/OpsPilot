import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Projects, Tasks, and Kanban Management APIs & Security Boundaries', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner / Admin
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer

  let createdProjectId = null;
  let createdMilestoneId1 = null;
  let createdMilestoneId2 = null;
  let createdMemberId = null;
  let createdTaskId = null;
  let createdCommentId = null;
  let createdAttachmentId = null;

  // ---------------------------------------------------------
  // 1. Project Creation & Zod Schema Validation
  // ---------------------------------------------------------
  await t.test('1.1 Allows Manager or Admin to create a new project', async () => {
    const payload = {
      name: `HVAC Modernization Phase ${Date.now().toString().slice(-4)}`,
      description: 'Comprehensive upgrade of building chillers and IoT telemetry nodes',
      client: 'Acme Central Facilities',
      budget: 85000,
      target_date: '2026-12-31',
      health: 'on_track',
      status: 'planning'
    };

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.project_code.startsWith('PRJ-'));
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);
    assert.equal(res.body.data.progress, 0);
    assert.equal(res.body.data.budget, 85000);

    createdProjectId = res.body.data.id;
  });

  await t.test('1.2 Rejects project creation with invalid input (400 Bad Request)', async () => {
    const invalidPayload = {
      name: 'X', // Minimum 2 characters required
      budget: -500 // Budget cannot be negative
    };

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test(
    '1.3 Rejects project creation by Employee or Customer with 403 Forbidden',
    async () => {
      const payload = {
        name: 'Unauthorized Project Attempt',
        description: 'Should be rejected by RBAC'
      };

      const resEmp = await request(app)
        .post('/api/projects')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send(payload);
      assert.equal(resEmp.status, 403);

      const resCust = await request(app)
        .post('/api/projects')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send(payload);
      assert.equal(resCust.status, 403);
    }
  );

  // ---------------------------------------------------------
  // 2. Project Listing, Search, and Filtering
  // ---------------------------------------------------------
  await t.test('2.1 Lists projects for tenant with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/projects?page=1&limit=10')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta);
    assert.ok(res.body.data.some((p) => p.id === createdProjectId));
  });

  await t.test('2.2 Filters projects by search term and status', async () => {
    const res = await request(app)
      .get('/api/projects?search=HVAC&status=planning')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((p) => p.status === 'planning'));
  });

  await t.test('2.3 Retrieves single project detail by ID', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdProjectId);
  });

  // ---------------------------------------------------------
  // 3. Project Milestones & Progress Calculation
  // ---------------------------------------------------------
  await t.test('3.1 Adds milestone 1 to project', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/milestones`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        title: 'Chiller Unit Delivery & Inspection',
        target_date: '2026-11-20',
        status: 'pending'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.project_id, createdProjectId);
    assert.equal(res.body.data.status, 'pending');

    createdMilestoneId1 = res.body.data.id;
  });

  await t.test('3.2 Adds milestone 2 to project', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/milestones`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        title: 'Telemetry Node Calibration & Commissioning',
        target_date: '2026-12-05',
        status: 'pending'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    createdMilestoneId2 = res.body.data.id;
    assert.ok(createdMilestoneId2);
  });

  await t.test('3.3 Lists all milestones for project', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}/milestones`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 2);
  });

  await t.test(
    '3.4 Updating milestone to completed automatically recalculates project progress to 50%',
    async () => {
      const res = await request(app)
        .patch(`/api/projects/${createdProjectId}/milestones/${createdMilestoneId1}`)
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ status: 'completed' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'completed');

      // Verify project progress updated to 50% (1 completed out of 2)
      const projectRes = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(projectRes.status, 200);
      assert.equal(projectRes.body.data.progress, 50);
    }
  );

  // ---------------------------------------------------------
  // 4. Project Members Assignment & Removal
  // ---------------------------------------------------------
  await t.test('4.1 Assigns workforce member to project', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/members`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        workforce_member_id: 'w1',
        project_role: 'Lead Project Technician'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.workforce_member_id, 'w1');

    createdMemberId = res.body.data.id;
  });

  await t.test('4.2 Retrieves project crew members hydrated with workforce data', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}/members`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((m) => m.workforce_member_id === 'w1'));
  });

  await t.test('4.3 Removes member from project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${createdProjectId}/members/${createdMemberId}`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.removed, true);
  });

  // ---------------------------------------------------------
  // 5. Task Creation & Zod Schema Validation
  // ---------------------------------------------------------
  await t.test('5.1 Creates a new task in todo column', async () => {
    const payload = {
      title: 'Inspect Primary Refrigerant Valve & Pressure Relief',
      description: 'Check telemetry readings and physical valve seal on unit 4B',
      category: 'Inspection',
      priority: 'high',
      column_name: 'todo',
      project_id: createdProjectId,
      due_date: '2026-11-25',
      checklist_total: 4,
      checklist_completed: 1
    };

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.task_code.startsWith('TSK-'));
    assert.equal(res.body.data.column_name, 'todo');
    assert.equal(res.body.data.priority, 'high');
    assert.equal(res.body.data.project_id, createdProjectId);

    createdTaskId = res.body.data.id;
  });

  await t.test('5.2 Rejects task creation with invalid priority or missing title', async () => {
    const invalidPayload = {
      title: '', // Missing title
      priority: 'super_critical' // Invalid priority enum
    };

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('5.3 Customer is forbidden from creating internal tasks', async () => {
    const payload = {
      title: 'Customer Task Attempt',
      priority: 'normal',
      column_name: 'todo'
    };

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 403);
  });

  // ---------------------------------------------------------
  // 6. Task Listing, Search, and Filtering
  // ---------------------------------------------------------
  await t.test('6.1 Lists tasks with pagination and project filter', async () => {
    const res = await request(app)
      .get(`/api/tasks?project_id=${createdProjectId}&page=1&limit=10`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((t) => t.id === createdTaskId));
  });

  await t.test('6.2 Filters tasks by priority and column', async () => {
    const res = await request(app)
      .get('/api/tasks?priority=high&column_name=todo')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((t) => t.priority === 'high' && t.column_name === 'todo'));
  });

  // ---------------------------------------------------------
  // 7. Kanban Drag-and-Drop Status Transitions & Server Validation
  // ---------------------------------------------------------
  await t.test('7.1 Moves task from todo to in_progress with server validation', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'in_progress' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.column_name, 'in_progress');
  });

  await t.test('7.2 Moves task from in_progress to review', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'review' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.column_name, 'review');
  });

  await t.test('7.3 Moves task from review to completed', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'completed' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.column_name, 'completed');
  });

  await t.test(
    '7.4 Rejects invalid column name with 400 Bad Request to protect state machine',
    async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}/status`)
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ column_name: 'invalid_column_name' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    }
  );

  await t.test('7.5 Customer cannot transition task status (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'in_progress' });

    assert.equal(res.status, 403);
  });

  // ---------------------------------------------------------
  // 8. Task Assignments, Comments & Attachments
  // ---------------------------------------------------------
  await t.test('8.1 Assigns technician to task', async () => {
    const res = await request(app)
      .post(`/api/tasks/${createdTaskId}/assignments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ workforce_member_id: 'w2' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.workforce_member_id, 'w2');
  });

  await t.test('8.2 Retrieves task assignments hydrated with workforce info', async () => {
    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}/assignments`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((a) => a.workforce_member_id === 'w2'));
  });

  await t.test('8.3 Adds discussion comment to task', async () => {
    const res = await request(app)
      .post(`/api/tasks/${createdTaskId}/comments`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        comment_text: 'Replaced high-pressure seal ring; pressure stabilized at 42 PSI.'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(
      res.body.data.comment_text,
      'Replaced high-pressure seal ring; pressure stabilized at 42 PSI.'
    );

    createdCommentId = res.body.data.id;
  });

  await t.test('8.4 Retrieves comments thread for task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}/comments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((c) => c.id === createdCommentId));
  });

  await t.test('8.5 Uploads / links an attachment for task', async () => {
    const res = await request(app)
      .post(`/api/tasks/${createdTaskId}/attachments`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        file_name: 'chiller_valve_calibration_report.pdf',
        file_url: 'https://storage.acmefleet.com/telemetry/chiller_valve_calibration_report.pdf',
        file_size: 204800,
        mime_type: 'application/pdf'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.file_name, 'chiller_valve_calibration_report.pdf');

    createdAttachmentId = res.body.data.id;
  });

  await t.test('8.6 Retrieves attachments for task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}/attachments`)
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((a) => a.id === createdAttachmentId));
  });

  // ---------------------------------------------------------
  // 9. Multi-Tenant Isolation & Security Enforcement
  // ---------------------------------------------------------
  await t.test(
    '9.1 Cross-tenant breach prevented: Apex cannot access Acme project (404/403)',
    async () => {
      const res = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID); // Sarah belongs to Acme, sending Apex tenant ID

      // Should be rejected by tenant security guard with 403 Forbidden
      assert.equal(res.status, 403);
    }
  );

  await t.test(
    '9.2 Cross-tenant breach prevented: Apex cannot transition Acme task status',
    async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}/status`)
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID)
        .send({ column_name: 'completed' });

      assert.equal(res.status, 403);
    }
  );

  await t.test('9.3 Verifies security audit log entry exists for project creation', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const hasProjectAudit = (res.body.data || []).some(
      (entry) =>
        entry.action === 'PROJECT_CREATED' ||
        entry.action === 'CREATE' ||
        entry.entity_id === createdProjectId ||
        entry.entityId === createdProjectId
    );
    assert.ok(hasProjectAudit, 'Expected audit event for created project');
  });
});
