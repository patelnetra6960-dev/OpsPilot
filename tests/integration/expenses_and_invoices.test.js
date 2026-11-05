import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Expense Approvals, Invoices & Payment Operations (Prompt 24)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee (w1)
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer (cust-acme-1)
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Manager

  let createdExpenseId = null;
  let createdExpenseClaimCode = null;
  let secondExpenseId = null;
  let createdInvoiceId = null;
  let createdInvoiceNumber = null;

  // =========================================================================
  // 1. Employee Expense Submissions & Validations
  // =========================================================================

  await t.test('1.1 Employee submits a valid expense claim with receipt', async () => {
    const payload = {
      category: 'fuel',
      description: 'Emergency diesel refueling for field service vehicle',
      amount: 85.5,
      claim_date: '2026-11-04',
      receipt_url: 'https://storage.opspilot.internal/receipts/fuel-receipt-8550.png',
      receipt_attached: true
    };

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.amount, 85.5);
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.category, 'fuel');
    assert.ok(res.body.data.claim_code.startsWith('EXP-'));
    assert.equal(res.body.data.workforce_member_id, 'w1');

    createdExpenseId = res.body.data.id;
    createdExpenseClaimCode = res.body.data.claim_code;
    assert.ok(createdExpenseClaimCode.length >= 7);
  });

  await t.test('1.2 Reject expense submissions with zero or negative amounts', async () => {
    const invalidPayload = {
      category: 'travel',
      description: 'Zero dollar expense attempt',
      amount: 0.0
    };

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(invalidPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('1.3 Employee can update their own pending expense claim', async () => {
    const updatePayload = {
      description: 'Emergency diesel refueling for mobile repair van (corrected)',
      amount: 89.75
    };

    const res = await request(app)
      .put(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(updatePayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.amount, 89.75);
    assert.equal(
      res.body.data.description,
      'Emergency diesel refueling for mobile repair van (corrected)'
    );
  });

  // =========================================================================
  // 2. Manager Approval & Rejection Workflows
  // =========================================================================

  await t.test('2.1 Manager approves employee expense claim', async () => {
    const res = await request(app)
      .post(`/api/expenses/${createdExpenseId}/approve`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ notes: 'Verified field dispatch log and approved fuel cost' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'approved');
    assert.ok(res.body.data.reviewed_at);
    assert.equal(res.body.data.review_notes, 'Verified field dispatch log and approved fuel cost');
  });

  await t.test('2.2 Cannot edit an expense once approved', async () => {
    const res = await request(app)
      .put(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ amount: 120.0 });

    assert.equal(res.status, 400);
    assert.match(
      res.body.error?.message || res.body.message,
      /Cannot edit an expense that has already been approved/i
    );
  });

  await t.test('2.3 Manager can mark approved expense as reimbursed', async () => {
    const res = await request(app)
      .post(`/api/expenses/${createdExpenseId}/reimburse`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ notes: 'Reimbursed on Payroll Cycle #22' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'reimbursed');
  });

  await t.test('2.4 Manager rejection requires mandatory rejection reason', async () => {
    // First submit a second claim
    const subRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        category: 'meals_entertainment',
        description: 'Team dinner during offsite job',
        amount: 142.0
      });

    assert.equal(subRes.status, 201);
    secondExpenseId = subRes.body.data.id;

    // Attempt rejection without reason
    const failRes = await request(app)
      .post(`/api/expenses/${secondExpenseId}/reject`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({});

    assert.equal(failRes.status, 400);

    // Reject with valid reason
    const rejRes = await request(app)
      .post(`/api/expenses/${secondExpenseId}/reject`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ rejection_reason: 'Missing itemized receipt showing breakdown' });

    assert.equal(rejRes.status, 200);
    assert.equal(rejRes.body.data.status, 'rejected');
    assert.equal(rejRes.body.data.review_notes, 'Missing itemized receipt showing breakdown');
  });

  await t.test('2.5 Expense history returns audit logs of approvals', async () => {
    const res = await request(app)
      .get(`/api/expenses/${secondExpenseId}/history`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].decision, 'rejected');
  });

  // =========================================================================
  // 3. Role-Based Access Control for Expenses
  // =========================================================================

  await t.test('3.1 Employee views ONLY own submitted expenses', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const exp of res.body.data) {
      assert.equal(exp.workforce_member_id, 'w1');
    }
  });

  await t.test('3.2 Manager can view all organizational expenses and stats', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);

    const statsRes = await request(app)
      .get('/api/expenses/stats')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.total_count >= 2);
    assert.ok(statsRes.body.data.total_amount > 0);
  });

  // =========================================================================
  // 4. Invoices & Itemized Calculations
  // =========================================================================

  await t.test('4.1 Create invoice with accurate decimal monetary calculations', async () => {
    const payload = {
      customer_id: 'cust-acme-1',
      due_date: '2026-12-15',
      discount_amount: 50.0,
      tax_rate: 10.0, // 10% tax
      notes: 'Commissioning of Substation B Backup Feeders',
      items: [
        {
          description: 'High-Voltage Cable Splicing & Termination (4-core)',
          quantity: 2,
          unit_price: 500.0 // 2 * 500 = 1000.00
        },
        {
          description: 'Dielectric Insulation Resistance & Hipot Testing',
          quantity: 1,
          unit_price: 250.0 // 1 * 250 = 250.00
        }
      ]
    };

    // Subtotal: 1250.00
    // Discount: 50.00
    // Taxable base: 1200.00
    // Tax (10%): 120.00
    // Total: 1320.00
    // Balance due: 1320.00

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subtotal, 1250.0);
    assert.equal(res.body.data.discount_amount, 50.0);
    assert.equal(res.body.data.tax, 120.0);
    assert.equal(res.body.data.total, 1320.0);
    assert.equal(res.body.data.paid_amount, 0.0);
    assert.equal(res.body.data.balance_due, 1320.0);
    assert.equal(res.body.data.status, 'pending');
    assert.ok(res.body.data.invoice_number.startsWith('INV-'));
    assert.equal(res.body.data.items.length, 2);

    createdInvoiceId = res.body.data.id;
    createdInvoiceNumber = res.body.data.invoice_number;
  });

  await t.test('4.2 Prevent duplicate invoice numbers within same tenant', async () => {
    const duplicatePayload = {
      invoice_number: createdInvoiceNumber,
      customer_id: 'cust-acme-1',
      due_date: '2026-12-31',
      items: [
        {
          description: 'Duplicate test item',
          quantity: 1,
          unit_price: 100.0
        }
      ]
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(duplicatePayload);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /already exists/i);
  });

  // =========================================================================
  // 5. Payments, Partial Settlements & PCI-DSS Safety
  // =========================================================================

  await t.test('5.1 Record partial payment against invoice', async () => {
    const paymentPayload = {
      payment_reference: 'ACH-2026-PART-01',
      amount: 500.0,
      payment_method: 'ach',
      notes: 'Initial 500 deposit transfer'
    };

    const res = await request(app)
      .post(`/api/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(paymentPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.invoice.paid_amount, 500.0);
    assert.equal(res.body.data.invoice.balance_due, 820.0); // 1320 - 500 = 820
    assert.equal(res.body.data.invoice.status, 'partial');
    assert.equal(res.body.data.payment.payment_reference, 'ACH-2026-PART-01');
  });

  await t.test('5.2 Strictly reject card number or CVV input (PCI-DSS compliance)', async () => {
    const dangerousPayload = {
      payment_reference: 'CC-REF-1092',
      amount: 200.0,
      payment_method: 'credit_card',
      card_number: '4111111111111111',
      cvv: '123'
    };

    const res = await request(app)
      .post(`/api/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(dangerousPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const detailMsg = JSON.stringify(res.body.error?.details || res.body);
    assert.match(detailMsg, /Payment card details/i);
  });

  await t.test('5.3 Prevent payment exceeding remaining balance', async () => {
    const overpaymentPayload = {
      payment_reference: 'CHK-OVER-999',
      amount: 900.0, // Remaining balance is 820.00
      payment_method: 'check'
    };

    const res = await request(app)
      .post(`/api/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(overpaymentPayload);

    assert.equal(res.status, 400);
    assert.match(res.body.error?.message || res.body.message, /cannot exceed remaining balance/i);
  });

  await t.test('5.4 Record final payment to transition invoice status to paid', async () => {
    const finalPaymentPayload = {
      payment_reference: 'WIRE-2026-FINAL-02',
      amount: 820.0,
      payment_method: 'bank_transfer',
      notes: 'Final settlement wire received'
    };

    const res = await request(app)
      .post(`/api/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(finalPaymentPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.invoice.paid_amount, 1320.0);
    assert.equal(res.body.data.invoice.balance_due, 0.0);
    assert.equal(res.body.data.invoice.status, 'paid');
    assert.ok(res.body.data.invoice.paid_at);
  });

  await t.test('5.5 Reject further payments once invoice is fully settled', async () => {
    const extraPayment = {
      payment_reference: 'CASH-EXTRA',
      amount: 50.0,
      payment_method: 'cash'
    };

    const res = await request(app)
      .post(`/api/invoices/${createdInvoiceId}/payments`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(extraPayment);

    assert.equal(res.status, 400);
    assert.match(res.body.error?.message || res.body.message, /already fully paid/i);
  });

  // =========================================================================
  // 6. Customer IDOR & Cross-Tenant Boundaries
  // =========================================================================

  await t.test('6.1 Customer can only view own invoices (IDOR Protection)', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const inv of res.body.data) {
      assert.equal(inv.customer_id, 'cust-acme-1');
    }
  });

  await t.test(
    '6.2 Cross-Tenant Isolation: User from Org 2 cannot access Org 1 financial records',
    async () => {
      const res = await request(app)
        .get('/api/invoices')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);

      const apexRes = await request(app)
        .get('/api/invoices')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(apexRes.status, 200);
      assert.ok(Array.isArray(apexRes.body.data));
      for (const inv of apexRes.body.data) {
        assert.equal(inv.organization_id, APEX_TENANT_ID);
      }
    }
  );

  // =========================================================================
  // 7. Printable Invoice View & Downloads
  // =========================================================================

  await t.test('7.1 Render printable invoice document with details and history', async () => {
    const res = await request(app)
      .get(`/api/invoices/${createdInvoiceId}/pdf`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.html.includes(createdInvoiceNumber));
    assert.ok(res.body.data.html.includes('$1320.00'));
    assert.ok(res.body.data.html.includes('ACH-2026-PART-01'));
    assert.ok(res.body.data.html.includes('WIRE-2026-FINAL-02'));
  });

  await t.test('7.2 Download invoice as printable HTML file with attachment header', async () => {
    const res = await request(app)
      .get(`/api/invoices/${createdInvoiceId}/download`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.headers['content-disposition'], /attachment; filename="Invoice-/);
    assert.ok(res.text.includes('OpsPilot Enterprise'));
  });
});
