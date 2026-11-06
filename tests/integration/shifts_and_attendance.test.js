import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { mockDatabase } from '../../server/src/config/supabase.js';

test('Integration Test: Shifts Scheduling, Collision Detection & Attendance (Prompt 31)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Manager

  let createdShiftId = null;
  let activeAttendanceId = null;

  // =========================================================================
  // 1. Shift Scheduling & Conflict Prevention
  // =========================================================================

  await t.test('1.1 Create shift schedule with valid timeframe', async () => {
    const payload = {
      workforce_member_id: 'w3', // Liam Patel
      start_time: '2026-11-10T08:00:00.000Z',
      end_time: '2026-11-10T16:30:00.000Z',
      department: 'Field Logistics',
      location_name: 'Metro Terminal Bay 4',
      location_lat: 40.7128,
      location_lng: -74.006,
      notes: 'Initial morning shift'
    };

    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.workforce_member_id, 'w3');
    assert.equal(res.body.data.status, 'scheduled');
    createdShiftId = res.body.data.id;
  });

  await t.test('1.2 Prevent overlapping shift creation for the same worker (SHIFT_SCHEDULE_CONFLICT)', async () => {
    // Overlapping timeframe: 14:00 to 20:00 on the same date for w3
    const conflictPayload = {
      workforce_member_id: 'w3',
      start_time: '2026-11-10T14:00:00.000Z',
      end_time: '2026-11-10T20:00:00.000Z',
      department: 'Field Logistics',
      location_name: 'Overlapping Station'
    };

    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(conflictPayload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'SHIFT_SCHEDULE_CONFLICT');
  });

  await t.test('1.3 Allow scheduling non-overlapping shift on different date or timeframe', async () => {
    const nonConflictPayload = {
      workforce_member_id: 'w3',
      start_time: '2026-11-11T08:00:00.000Z',
      end_time: '2026-11-11T16:30:00.000Z',
      department: 'Field Logistics',
      location_name: 'Harbor Gate 12'
    };

    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(nonConflictPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  await t.test('1.4 Retrieve shifts directory with tenant scope', async () => {
    const res = await request(app)
      .get('/api/v1/shifts')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length >= 1);
    // Every shift must belong to Acme tenant
    res.body.data.forEach((s) => {
      assert.equal(s.organization_id, ACME_TENANT_ID);
    });
  });

  await t.test('1.5 Cross-tenant shift isolation: Marcus (Apex) cannot modify Acme shift', async () => {
    const res = await request(app)
      .delete(`/api/v1/shifts/${createdShiftId}`)
      .set('Authorization', MARCUS_TOKEN)
      .set('X-Tenant-Id', APEX_TENANT_ID);

    assert.equal(res.status, 404);
  });

  // =========================================================================
  // 2. Attendance Clock-In / Clock-Out & Geofence
  // =========================================================================

  await t.test('2.1 Worker clocks in with GPS coordinates', async () => {
    const payload = {
      workforce_member_id: 'w3',
      shift_id: createdShiftId,
      latitude: 40.7128,
      longitude: -74.006,
      notes: 'Morning shift arrival'
    };

    const res = await request(app)
      .post('/api/v1/attendance/clock-in')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.workforce_member_id, 'w3');
    assert.equal(res.body.data.clock_in_geofence_verified, true);
    assert.equal(res.body.data.clock_out_time, null);
    activeAttendanceId = res.body.data.id;
  });

  await t.test('2.2 Reject duplicate clock-in when worker already has an active session', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/clock-in')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ workforce_member_id: 'w3' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'ALREADY_CLOCKED_IN');
  });

  await t.test('2.3 Worker clocks out and hours are calculated', async () => {
    const payload = {
      latitude: 40.7129,
      longitude: -74.0061,
      break_minutes: 30,
      notes: 'Shift completed cleanly'
    };

    const res = await request(app)
      .post('/api/v1/attendance/clock-out')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send(payload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(res.body.data.clock_out_time !== null);
    assert.equal(res.body.data.break_minutes, 30);
  });

  await t.test('2.4 Reject clock-out when no active session exists', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/clock-out')
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error?.code, 'NO_ACTIVE_CLOCK_IN');
  });

  // =========================================================================
  // 3. Timesheet Review & Manager Approval
  // =========================================================================

  await t.test('3.1 Manager reviews timesheets pending approval', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/timesheets')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.data));
  });

  await t.test('3.2 Manager approves timesheet record', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance/timesheets/${activeAttendanceId}/approve`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_TENANT_ID)
      .send({ status: 'approved', notes: 'Approved by dispatch manager' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'approved');
  });

  // =========================================================================
  // 4. Invitation Verification & Acceptance Flow
  // =========================================================================

  await t.test('4.1 Verify invitation token via public endpoint', async () => {
    // Seed a valid invitation in mockDatabase
    const testToken = 'invite-test-token-777';
    if (!mockDatabase.invitations) mockDatabase.invitations = [];
    mockDatabase.invitations.push({
      id: 'inv-777',
      organization_id: ACME_TENANT_ID,
      email: 'new.tech@acme.com',
      role: 'employee',
      department_id: null,
      token: testToken,
      status: 'pending',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString()
    });

    const res = await request(app).get(`/api/v1/organizations/invitations/${testToken}/verify`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'new.tech@acme.com');
    assert.equal(res.body.data.role, 'employee');
    assert.equal(res.body.data.organization_name, 'Acme Logistics Global');
  });

  await t.test('4.2 Reject invalid or nonexistent invitation token', async () => {
    const res = await request(app).get('/api/v1/organizations/invitations/nonexistent-token/verify');
    assert.equal(res.status, 404);
  });

  await t.test('4.3 Authenticated user accepts invitation and joins organization', async () => {
    const testToken = 'invite-test-token-777';
    const res = await request(app)
      .post(`/api/v1/organizations/invitations/${testToken}/accept`)
      .set('Authorization', DAVID_TOKEN)
      .send({ full_name: 'David Field Technician' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
