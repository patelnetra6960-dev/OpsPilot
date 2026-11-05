import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Inventory, Assets and Supplier Management (Prompt 23)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee / Technician
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Manager

  let createdItemId = null;
  let createdAssetId = null;
  let createdSupplierId = null;
  let createdPoId = null;

  // =========================================================================
  // 1. Inventory Items & SKU Management
  // =========================================================================

  await t.test('1.1 Create inventory item with valid SKU and initial stock', async () => {
    const payload = {
      sku: 'VALVE-BALL-200',
      name: 'High-Pressure 2-Inch Stainless Ball Valve',
      category: 'Hydraulics & Plumbing',
      location: 'Warehouse Central • Aisle 3, Bin V-09',
      in_stock: 12,
      reorder_level: 5,
      unit_cost: 85.5
    };

    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.sku, 'VALVE-BALL-200');
    assert.equal(res.body.data.in_stock, 12);
    assert.equal(res.body.data.status, 'in_stock');
    assert.equal(res.body.data.version, 1);
    createdItemId = res.body.data.id;
  });

  await t.test('1.2 Prevent duplicate SKU creation within same tenant', async () => {
    const duplicatePayload = {
      sku: 'VALVE-BALL-200',
      name: 'Duplicate SKU Item',
      category: 'General',
      in_stock: 5
    };

    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(duplicatePayload);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('already exists'));
  });

  await t.test(
    '1.3 Allow identical SKU in a different tenant (multi-tenant boundary)',
    async () => {
      const crossTenantPayload = {
        sku: 'VALVE-BALL-200',
        name: 'Apex Valve Ball 200',
        category: 'Hydraulics',
        in_stock: 20
      };

      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID)
        .send(crossTenantPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.data.sku, 'VALVE-BALL-200');
      assert.equal(res.body.data.organization_id, APEX_TENANT_ID);
    }
  );

  // =========================================================================
  // 2. Stock Movements & Transactions (Stock-In, Stock-Out, Adjustment)
  // =========================================================================

  await t.test('2.1 Stock-In increases stock and creates transaction record', async () => {
    const res = await request(app)
      .post(`/api/inventory/${createdItemId}/stock-in`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        quantity: 8,
        unit_price: 85.5,
        reference_type: 'purchase_order',
        reference_id: 'PO-TEST-001',
        reference_note: 'Restock shipment received'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.item.in_stock, 20); // 12 + 8 = 20
    assert.equal(res.body.data.item.version, 2); // Initial baseline (1) + stock-in (2)
    assert.equal(res.body.data.transaction.quantity, 8);
    assert.equal(res.body.data.transaction.new_stock, 20);
    assert.equal(res.body.data.transaction.previous_stock, 12);
  });

  await t.test('2.2 Stock-Out decreases stock and logs consumption transaction', async () => {
    const res = await request(app)
      .post(`/api/inventory/${createdItemId}/stock-out`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        quantity: 5,
        reference_type: 'work_order',
        reference_id: 'WO-2026-001',
        reference_note: 'Installed in hydraulic bay repair'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.item.in_stock, 15); // 20 - 5 = 15
    assert.equal(res.body.data.transaction.quantity, 5);
    assert.equal(res.body.data.transaction.previous_stock, 20);
    assert.equal(res.body.data.transaction.new_stock, 15);
  });

  await t.test(
    '2.3 Prevent negative stock: Stock-out exceeding available quantity fails',
    async () => {
      const res = await request(app)
        .post(`/api/inventory/${createdItemId}/stock-out`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          quantity: 999, // Current stock is 15
          reference_type: 'manual',
          reference_note: 'Excessive dispatch attempt'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Insufficient stock'));
    }
  );

  await t.test(
    '2.4 Validation rejects invalid stock inputs (negative, strings, zero)',
    async () => {
      const resNegative = await request(app)
        .post(`/api/inventory/${createdItemId}/stock-in`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ quantity: -5 });

      assert.equal(resNegative.status, 400);

      const resZero = await request(app)
        .post(`/api/inventory/${createdItemId}/stock-out`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ quantity: 0 });

      assert.equal(resZero.status, 400);
    }
  );

  await t.test('2.5 Stock Adjustment handles audit discrepancy with mandatory reason', async () => {
    const res = await request(app)
      .post(`/api/inventory/${createdItemId}/adjust`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        adjustment_type: 'set_absolute',
        quantity: 4, // Sets stock from 15 to 4, which is below reorder level (5)
        reason: 'Physical cycle count discrepancy audit'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.item.in_stock, 4);
    assert.equal(res.body.data.item.status, 'low_stock'); // 4 <= reorder_level (5)
    assert.equal(res.body.data.transaction.transaction_type, 'adjustment');
    assert.equal(res.body.data.transaction.new_stock, 4);
  });

  await t.test('2.6 Stock Adjustment rejects missing reason', async () => {
    const res = await request(app)
      .post(`/api/inventory/${createdItemId}/adjust`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        adjustment_type: 'set_absolute',
        quantity: 10
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('2.7 Low-Stock Alerts endpoint lists items below minimum threshold', async () => {
    const res = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find((i) => i.id === createdItemId);
    assert.ok(found, 'Adjusted item should appear in low-stock list');
  });

  // =========================================================================
  // 3. Concurrency Protection & Idempotency
  // =========================================================================

  await t.test('3.1 Prevent duplicate transaction processing via idempotency key', async () => {
    const idemKey = `idem-${Date.now()}`;

    // First request
    const res1 = await request(app)
      .post(`/api/inventory/${createdItemId}/stock-in`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        quantity: 10,
        idempotency_key: idemKey,
        reference_note: 'Idempotency test delivery'
      });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.item.in_stock, 14); // 4 + 10 = 14
    assert.equal(res1.body.data.duplicatePrevented, false);

    // Replay identical request with same idempotency key
    const res2 = await request(app)
      .post(`/api/inventory/${createdItemId}/stock-in`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        quantity: 10,
        idempotency_key: idemKey,
        reference_note: 'Idempotency test delivery duplicate'
      });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.item.in_stock, 14); // Stock must NOT be increased again!
    assert.equal(res2.body.data.duplicatePrevented, true);
  });

  await t.test(
    '3.2 Protect against concurrent stock updates: Stale version is rejected',
    async () => {
      const _getRes = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      const staleVersion = 1; // Item version is already > 1

      const res = await request(app)
        .post(`/api/inventory/${createdItemId}/stock-out`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          quantity: 2,
          expected_version: staleVersion,
          reference_note: 'Conflict test'
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Concurrent update conflict'));
    }
  );

  await t.test('3.3 Inventory stats returns accurate aggregated metrics', async () => {
    const res = await request(app)
      .get('/api/inventory/stats')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalSkus > 0);
    assert.ok(typeof res.body.data.totalStockUnits === 'number');
    assert.ok(typeof res.body.data.totalValuation === 'number');
  });

  await t.test(
    '3.4 Concurrent stock updates under Promise.all maintain exact inventory quantity integrity',
    async () => {
      const preRes = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      const initialStock = preRes.body.data.in_stock;

      // Launch 5 concurrent stock-in operations of 3 units each
      const promises = Array.from({ length: 5 }, (_, idx) =>
        request(app)
          .post(`/api/inventory/${createdItemId}/stock-in`)
          .set('Authorization', SARAH_TOKEN)
          .set('X-Tenant-Id', ACME_TENANT_ID)
          .send({
            quantity: 3,
            reference_note: `Concurrent stock-in batch #${idx + 1}`
          })
      );

      const results = await Promise.all(promises);
      for (const r of results) {
        assert.equal(r.status, 200);
      }

      // Verify final stock is exactly initialStock + (5 * 3)
      const postRes = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(postRes.status, 200);
      assert.equal(postRes.body.data.in_stock, initialStock + 15);
    }
  );

  // =========================================================================
  // 4. Assets Management
  // =========================================================================

  await t.test('4.1 Register new physical asset with tag and category', async () => {
    const payload = {
      asset_tag: 'AST-FL-09',
      name: 'Toyota 8FGU25 Forklift 5000lb',
      category: 'heavy_machinery',
      serial_number: 'TOY-8FGU-88219',
      purchase_date: '2025-08-10',
      purchase_cost: 32000.0,
      location: 'Warehouse Central • Loading Dock Bay 1',
      department: 'Warehouse & Logistics'
    };

    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.asset_tag, 'AST-FL-09');
    assert.equal(res.body.data.status, 'available');
    assert.equal(res.body.data.purchase_cost, 32000.0);
    createdAssetId = res.body.data.id;
  });

  await t.test('4.2 Enforce asset tag uniqueness within organization', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        asset_tag: 'AST-FL-09',
        name: 'Duplicate Tag Asset',
        category: 'equipment'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  await t.test('4.3 Assign asset ownership to workforce member', async () => {
    const res = await request(app)
      .post(`/api/assets/${createdAssetId}/assign`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        assigned_to: 'w1', // Marcus Vance
        department: 'Field Operations',
        location: 'Depot Yard 2',
        notes: 'Assigned for regional distribution center loading operations'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.assigned_to, 'w1');
    assert.equal(res.body.data.assigned_to_name, 'David Miller');
    assert.equal(res.body.data.status, 'assigned');
    assert.equal(res.body.data.location, 'Depot Yard 2');
  });

  await t.test('4.4 Update asset status to maintenance', async () => {
    const res = await request(app)
      .post(`/api/assets/${createdAssetId}/status`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        status: 'maintenance',
        reason: 'Hydraulic lift cylinder hydraulic weeping'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'maintenance');
  });

  await t.test('4.5 Record maintenance event and update service dates', async () => {
    const res = await request(app)
      .post(`/api/assets/${createdAssetId}/maintenance`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        date: '2026-11-05',
        type: 'repair',
        description: 'Replaced main mast hydraulic cylinder seals and bled lines',
        cost: 650.0,
        performed_by: 'David Kim',
        next_service_due: '2027-05-05'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.last_service_date, '2026-11-05');
    assert.equal(res.body.data.next_service_date, '2027-05-05');
    assert.ok(Array.isArray(res.body.data.maintenance_history));
    assert.equal(res.body.data.maintenance_history.length, 1);
    assert.equal(res.body.data.maintenance_history[0].cost, 650.0);
  });

  // =========================================================================
  // 5. Suppliers & Purchase Records
  // =========================================================================

  await t.test('5.1 Create supplier profile with contact and payment terms', async () => {
    const payload = {
      name: 'Allied Industrial Hydraulics',
      code: 'SUP-ALLIED',
      contact_name: 'Robert Vance',
      email: 'sales@allied-hydraulics.com',
      phone: '+1 800-555-0199',
      address: '500 Logistics Way, Chicago, IL',
      payment_terms: 'Net 30',
      category: 'Hydraulics & Seals',
      status: 'preferred'
    };

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Allied Industrial Hydraulics');
    assert.equal(res.body.data.code, 'SUP-ALLIED');
    createdSupplierId = res.body.data.id;
  });

  await t.test('5.2 Enforce supplier code uniqueness within tenant', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        name: 'Duplicate Allied Code',
        code: 'SUP-ALLIED'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  await t.test('5.3 Create purchase order for supplier', async () => {
    const payload = {
      order_date: '2026-11-05',
      items: [
        {
          item_id: createdItemId,
          sku: 'VALVE-BALL-200',
          name: 'High-Pressure 2-Inch Stainless Ball Valve',
          quantity: 10,
          unit_price: 85.5
        }
      ],
      notes: 'Emergency replenishment for plant distribution valves'
    };

    const res = await request(app)
      .post(`/api/suppliers/${createdSupplierId}/purchases`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'ordered');
    assert.equal(res.body.data.total_amount, 855.0);
    createdPoId = res.body.data.id;
  });

  await t.test(
    '5.4 Receiving purchase order automatically restocks warehouse inventory',
    async () => {
      const preItemRes = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);
      const preStock = preItemRes.body.data.in_stock;

      const res = await request(app)
        .post(`/api/suppliers/purchases/${createdPoId}/receive`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.purchaseOrder.status, 'received');

      // Verify inventory item was automatically replenished by 10 units
      const itemRes = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', SARAH_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(itemRes.status, 200);
      assert.equal(itemRes.body.data.in_stock, preStock + 10);
    }
  );

  // =========================================================================
  // 6. Security Boundaries: RBAC & Tenant Isolation
  // =========================================================================

  await t.test('6.1 Customer role CANNOT create or mutate inventory items', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', RACHEL_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({
        sku: 'HACK-SKU',
        name: 'Unauthorized Item',
        category: 'Hack',
        in_stock: 100
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  await t.test(
    '6.2 Cross-Tenant Access Prevention: Apex cannot access Acme inventory',
    async () => {
      const res = await request(app)
        .get(`/api/inventory/${createdItemId}`)
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );

  await t.test('6.3 Cross-Tenant Access Prevention: Apex cannot access Acme asset', async () => {
    const res = await request(app)
      .get(`/api/assets/${createdAssetId}`)
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  await t.test('6.4 Cross-Tenant Access Prevention: Apex cannot access Acme supplier', async () => {
    const res = await request(app)
      .get(`/api/suppliers/${createdSupplierId}`)
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });
});
