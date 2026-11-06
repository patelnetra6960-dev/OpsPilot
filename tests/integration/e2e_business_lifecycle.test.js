import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('End-to-End Complete Business Lifecycle (Prompt 29)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';

  // Standard Persona Tokens
  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee / Technician
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer (Metro Health)

  // Tracking state through the 8 stages
  let registeredOrgId = null;
  let onboardedEmployeeId = null;
  let createdProjectId = null;
  let createdTaskId = null;
  let createdServiceRequestId = null;
  let createdWorkOrderId = null;
  let createdInvoiceId = null;

  // =========================================================================
  // Stage 1: Organization Registration & Setup
  // =========================================================================
  await t.test('Stage 1: Organization Registration & Setup', async () => {
    const orgPayload = {
      name: 'Titan Fleet Logistics & Field Services',
      slug: `titan-fleet-${Date.now()}`,
      industry: 'Field Operations & Transportation',
      size: '50-100'
    };

    const res = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', ALEX_TOKEN)
      .send(orgPayload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Organization ID must be returned');
    assert.equal(res.body.data.name, orgPayload.name);
    registeredOrgId = res.body.data.id;
    assert.ok(registeredOrgId);
  });

  // =========================================================================
  // Stage 2: Employee Onboarding & Workforce Profile
  // =========================================================================
  await t.test('Stage 2: Employee Onboarding & Workforce Profile', async () => {
    const employeePayload = {
      employee_code: `EMP-QA-${Math.floor(Math.random() * 9000 + 1000)}`,
      first_name: 'Elena',
      last_name: 'Vance',
      email: `elena.vance.${Date.now()}@acme.com`,
      department: 'Robotics & Automation',
      designation: 'Senior Automation Engineer',
      employment_type: 'full_time',
      hourly_rate: 65.0,
      role: 'employee'
    };

    const res = await request(app)
      .post('/api/v1/workforce')
      .set('Authorization', ALEX_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(employeePayload);

    assert.equal(res.status, 201, `Failed to onboard employee: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Workforce member ID must be returned');
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);
    assert.equal(res.body.data.first_name, 'Elena');
    onboardedEmployeeId = res.body.data.id;
  });

  // =========================================================================
  // Stage 3: Project Creation
  // =========================================================================
  await t.test('Stage 3: Project Creation', async () => {
    const projectPayload = {
      name: 'Autonomous Conveyor System Modernization',
      client: 'Metro Health Hospitals',
      description: 'Full retrofit of distribution center conveyor PLC controllers and motors',
      status: 'in_progress',
      health: 'on_track',
      priority: 'high',
      budget: 85000,
      start_date: '2026-11-01',
      target_date: '2026-12-31'
    };

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(projectPayload);

    assert.equal(res.status, 201, `Failed to create project: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.organization_id, ACME_TENANT_ID);
    assert.equal(res.body.data.name, projectPayload.name);
    createdProjectId = res.body.data.id;
  });

  // =========================================================================
  // Stage 4: Task Assignment
  // =========================================================================
  await t.test('Stage 4: Task Assignment', async () => {
    const taskPayload = {
      title: 'PLC Motor Inverter Firmware Flash',
      description: 'Deploy v4.2.1 firmware update to conveyor inverter drives',
      priority: 'high',
      project_id: createdProjectId,
      due_date: '2026-11-25',
      estimated_hours: 6
    };

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(taskPayload);

    assert.equal(res.status, 201, `Failed to create task: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.project_id, createdProjectId);
    createdTaskId = res.body.data.id;

    // Assign to onboarded employee
    const assignRes = await request(app)
      .post(`/api/v1/tasks/${createdTaskId}/assignments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        workforce_member_id: onboardedEmployeeId
      });

    assert.equal(assignRes.status, 201);
    assert.equal(assignRes.body.success, true);
  });

  // =========================================================================
  // Stage 5: Task Execution & Completion
  // =========================================================================
  await t.test('Stage 5: Task Execution & Completion', async () => {
    // 5.1 Move to in_progress
    const inProgressRes = await request(app)
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'in_progress' });

    assert.equal(inProgressRes.status, 200);
    assert.equal(inProgressRes.body.data.column_name, 'in_progress');

    // 5.2 Move to completed
    const doneRes = await request(app)
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ column_name: 'completed' });

    assert.equal(doneRes.status, 200);
    assert.equal(doneRes.body.data.column_name, 'completed');
  });

  // =========================================================================
  // Stage 6: Customer Service Request Submission & Approval
  // =========================================================================
  await t.test('Stage 6: Customer Service Request Submission & Approval', async () => {
    // 6.1 Customer submits service request
    const requestPayload = {
      title: 'Emergency Generator Coolant Sensor Fault',
      description: 'Sensor #4 reading intermittent temperature spikes during weekly load test',
      location: 'Metro Health Hospital - Power Substation B',
      service_type: 'repair',
      urgency: 'critical',
      estimated_cost: 950
    };

    const submitRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(requestPayload);

    assert.equal(submitRes.status, 201, `Failed to submit service request: ${JSON.stringify(submitRes.body)}`);
    assert.equal(submitRes.body.success, true);
    assert.ok(submitRes.body.data.id);
    assert.equal(submitRes.body.data.status, 'new');
    createdServiceRequestId = submitRes.body.data.id;

    // 6.2 Review and approve the service request
    const reviewRes = await request(app)
      .post(`/api/v1/service-requests/${createdServiceRequestId}/review`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        review_notes: 'Manager initial assessment: valid auxiliary generator critical alert'
      });
    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.data.status, 'in_review');

    const approveRes = await request(app)
      .post(`/api/v1/service-requests/${createdServiceRequestId}/approve`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        approval_notes: 'Urgent medical facility auxiliary power system. Approved for dispatch.'
      });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'approved');
  });

  // =========================================================================
  // Stage 7: Work Order Generation, Execution & Closure
  // =========================================================================
  await t.test('Stage 7: Work Order Generation, Execution & Closure', async () => {
    // 7.1 Generate Work Order from Approved Service Request
    const workOrderPayload = {
      service_request_id: createdServiceRequestId,
      title: 'WO: Replace Coolant Temperature Sensor & Flush Loop',
      description: 'Replace thermocouple wiring harness, install new calibrated sensor, test load',
      priority: 'critical',
      scheduled_date: '2026-11-10',
      assigned_to: 'w1' // David Miller
    };

    const createWoRes = await request(app)
      .post('/api/v1/work-orders')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(workOrderPayload);

    assert.equal(createWoRes.status, 201, `Failed to create work order: ${JSON.stringify(createWoRes.body)}`);
    assert.equal(createWoRes.body.success, true);
    assert.ok(createWoRes.body.data.id);
    assert.equal(createWoRes.body.data.service_request_id, createdServiceRequestId);
    createdWorkOrderId = createWoRes.body.data.id;

    // 7.2 Technician assigned and dispatches to in_progress
    const inProgWoRes = await request(app)
      .post(`/api/v1/work-orders/${createdWorkOrderId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ status: 'in_progress', reason: 'Technician on site beginning diagnostic loop' });

    assert.equal(inProgWoRes.status, 200);
    assert.equal(inProgWoRes.body.data.status, 'in_progress');

    // 7.3 Add Checklist Item
    const checklistRes = await request(app)
      .post(`/api/v1/work-orders/${createdWorkOrderId}/checklists`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        item_text: 'Calibrate coolant temp sensor with reference multimeter'
      });

    assert.equal(checklistRes.status, 201);
    const checklistItemId = checklistRes.body.data.id;

    // 7.4 Complete Checklist Item
    const checkItemRes = await request(app)
      .patch(`/api/v1/work-orders/${createdWorkOrderId}/checklists/${checklistItemId}`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ is_completed: true });

    assert.equal(checkItemRes.status, 200);

    // 7.5 Upload Photographs (Before & After)
    const photoRes = await request(app)
      .post(`/api/v1/work-orders/${createdWorkOrderId}/photos`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        type: 'after',
        url: 'https://storage.opspilot.internal/vault/sensor_post_install.jpg',
        caption: 'New thermocouple securely fitted and heat-shielded'
      });

    assert.equal(photoRes.status, 201);

    // 7.6 Complete Work Order
    const completeWoRes = await request(app)
      .post(`/api/v1/work-orders/${createdWorkOrderId}/status`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        status: 'completed',
        reason: 'All load testing passed with nominal temperatures across 45-minute continuous run.'
      });

    assert.equal(completeWoRes.status, 200);
    assert.equal(completeWoRes.body.data.status, 'completed');

    // 7.7 Customer Confirmation & Formal Closure
    const closeRes = await request(app)
      .post(`/api/v1/work-orders/${createdWorkOrderId}/status`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        status: 'closed',
        reason: 'Verified customer signoff and generator standby operations confirmed'
      });

    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.status, 'closed');
  });

  // =========================================================================
  // Stage 8: Invoice Generation & Payment Confirmation
  // =========================================================================
  await t.test('Stage 8: Invoice Generation & Payment Confirmation', async () => {
    // 8.1 Manager creates Invoice referencing Work Order & Customer
    const invoicePayload = {
      customer_id: 'cust-acme-1', // Metro Health
      work_order_id: createdWorkOrderId,
      due_date: '2026-12-15',
      tax_rate: 8.5,
      discount_amount: 50.0,
      notes: 'Emergency generator sensor replacement and calibration services',
      items: [
        {
          description: 'Industrial Thermocouple Sensor Module (Part #TH-902)',
          quantity: 1,
          unit_price: 350.0
        },
        {
          description: 'Emergency Field Engineering Labor (Hours)',
          quantity: 4,
          unit_price: 150.0
        }
      ]
    };

    const createInvRes = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invoicePayload);

    assert.equal(createInvRes.status, 201, `Failed to create invoice: ${JSON.stringify(createInvRes.body)}`);
    assert.equal(createInvRes.body.success, true);
    assert.ok(createInvRes.body.data.id);
    assert.ok(createInvRes.body.data.invoice_number);
    // Subtotal: 350 + (4 * 150) = 950. Discount: 50 => 900. Tax: 8.5% of 900 = 76.50 => Total: 976.50
    assert.equal(createInvRes.body.data.subtotal, 950.0);
    assert.equal(createInvRes.body.data.total, 976.50);
    assert.equal(createInvRes.body.data.status, 'pending');
    createdInvoiceId = createInvRes.body.data.id;

    // 8.2 Record full payment transaction against the invoice
    const paymentPayload = {
      amount: 976.50,
      payment_date: '2026-11-06',
      payment_method: 'credit_card',
      payment_reference: 'AUTH-MH-99281',
      notes: 'Full payment via corporate procurement card'
    };

    const paymentRes = await request(app)
      .post(`/api/v1/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(paymentPayload);

    assert.equal(paymentRes.status, 201, `Failed to record payment: ${JSON.stringify(paymentRes.body)}`);
    assert.equal(paymentRes.body.success, true);
    assert.equal(paymentRes.body.data.invoice.status, 'paid');
    assert.equal(paymentRes.body.data.invoice.balance_due, 0.0);
    assert.equal(paymentRes.body.data.invoice.paid_amount, 976.50);

    // 8.3 Verify Customer can view the paid invoice and download PDF
    const customerInvRes = await request(app)
      .get(`/api/v1/invoices/${createdInvoiceId}`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(customerInvRes.status, 200);
    assert.equal(customerInvRes.body.data.status, 'paid');
    assert.equal(customerInvRes.body.data.balance_due, 0.0);

    const pdfRes = await request(app)
      .get(`/api/v1/invoices/${createdInvoiceId}/pdf`)
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(pdfRes.status, 200);
    assert.ok(pdfRes.text.includes('<!DOCTYPE html>') || pdfRes.text.includes('<html'), 'Invoice printable HTML must be returned');
    assert.ok(pdfRes.text.includes(createInvRes.body.data.invoice_number));
  });
});
