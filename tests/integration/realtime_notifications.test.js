import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import request from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../../server/src/app.js';
import { initSocketServer, closeSocketServer } from '../../server/src/socket/socket.server.js';
import notificationService from '../../server/src/services/notification.service.js';
import { revokeToken } from '../../server/src/middleware/authMiddleware.js';

test('Integration Test: Real-Time Notifications & WebSocket Activity System', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const SARAH_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const _MARCUS_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const ALEX_TOKEN = 'mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'mock-token-sarah'; // Acme Manager
  const MARCUS_TOKEN = 'mock-token-marcus'; // Apex Owner
  const RACHEL_TOKEN = 'mock-token-rachel'; // Acme Customer
  const EXPIRED_TOKEN = 'mock-token-expired';
  const REVOKED_TOKEN = 'mock-token-to-revoke-1234';

  revokeToken(REVOKED_TOKEN);

  let server;
  let serverPort;
  let socketUrl;

  t.before(async () => {
    server = http.createServer(app);
    initSocketServer(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        socketUrl = `http://localhost:${serverPort}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    closeSocketServer();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Helper to connect a socket client and wait for connect or connect_error
  const createClient = (token, orgId, extraOpts = {}) => {
    return Client(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token: token || undefined,
        organizationId: orgId || undefined
      },
      ...extraOpts
    });
  };

  // =========================================================================
  // 1. Unauthorized Socket Connection Tests
  // =========================================================================

  await t.test('Rejects socket connection without access token', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(null, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        try {
          assert.ok(err.message.includes('Authentication required: Missing access token'));
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Connection unexpectedly succeeded without token'));
      });
    });
  });

  await t.test('Rejects socket connection with revoked access token', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(REVOKED_TOKEN, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        try {
          assert.ok(err.message.includes('Session token has been revoked'));
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Connection unexpectedly succeeded with revoked token'));
      });
    });
  });

  await t.test('Rejects socket connection with expired access token', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(EXPIRED_TOKEN, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        try {
          assert.ok(err.message.includes('Token expired'));
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Connection unexpectedly succeeded with expired token'));
      });
    });
  });

  await t.test('Rejects socket connection missing organizationId tenant context', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(ALEX_TOKEN, null);
      client.on('connect_error', (err) => {
        try {
          assert.ok(err.message.includes('Tenant context required'));
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Connection unexpectedly succeeded without tenant context'));
      });
    });
  });

  await t.test('Rejects cross-tenant socket connection (Marcus accessing Acme)', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(MARCUS_TOKEN, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        try {
          assert.ok(
            err.message.includes('Unauthorized tenant') ||
              err.message.includes('not an active member')
          );
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Cross-tenant connection unexpectedly succeeded'));
      });
    });
  });

  // =========================================================================
  // 2. Authorized Socket Connection & Room Memberships
  // =========================================================================

  await t.test('Authorized user successfully connects and receives server-governed rooms', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(ALEX_TOKEN, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        client.disconnect();
        reject(err);
      });
      client.on('connection:ready', (data) => {
        try {
          assert.equal(data.connected, true);
          assert.equal(data.userId, ALEX_USER_ID);
          assert.equal(data.organizationId, ACME_TENANT_ID);
          assert.equal(data.role, 'owner');
          assert.ok(data.rooms.includes(`user:${ALEX_USER_ID}`));
          assert.ok(data.rooms.includes(`org:${ACME_TENANT_ID}`));
          assert.ok(data.rooms.includes(`org:${ACME_TENANT_ID}:owner`));
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
    });
  });

  await t.test('Customer persona successfully connects with customer role', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(RACHEL_TOKEN, ACME_TENANT_ID);
      client.on('connect_error', (err) => {
        client.disconnect();
        reject(err);
      });
      client.on('connection:ready', (data) => {
        try {
          assert.equal(data.connected, true);
          assert.equal(data.organizationId, ACME_TENANT_ID);
          assert.equal(data.role, 'customer');
          client.disconnect();
          resolve();
        } catch (e) {
          client.disconnect();
          reject(e);
        }
      });
    });
  });

  // =========================================================================
  // 3. Strict Room Join Guard & Arbitrary Room Name Rejection
  // =========================================================================

  await t.test('Rejects arbitrary client-requested room names (Never trust client room names)', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(ALEX_TOKEN, ACME_TENANT_ID);
      client.on('connect', () => {
        // Attempt to join arbitrary secret room
        client.emit('room:join', 'arbitrary-admin-room', (response) => {
          try {
            assert.equal(response.success, false);
            assert.ok(response.error.includes('Forbidden'));

            // Attempt to join foreign tenant room
            client.emit('room:join', `org:${APEX_TENANT_ID}`, (foreignRes) => {
              try {
                assert.equal(foreignRes.success, false);
                assert.ok(foreignRes.error.includes('Forbidden'));
                client.disconnect();
                resolve();
              } catch (e) {
                client.disconnect();
                reject(e);
              }
            });
          } catch (e) {
            client.disconnect();
            reject(e);
          }
        });
      });
    });
  });

  await t.test('Allows client to join authorized scoped entity sub-room within own tenant', async () => {
    await new Promise((resolve, reject) => {
      const client = createClient(ALEX_TOKEN, ACME_TENANT_ID);
      client.on('connect', () => {
        const legitimateSubRoom = `org:${ACME_TENANT_ID}:tasks`;
        client.emit('room:join', legitimateSubRoom, (response) => {
          try {
            assert.equal(response.success, true);
            assert.equal(response.room, legitimateSubRoom);
            client.disconnect();
            resolve();
          } catch (e) {
            client.disconnect();
            reject(e);
          }
        });
      });
    });
  });

  // =========================================================================
  // 4. Cross-Tenant Event Leakage Prevention
  // =========================================================================

  await t.test('Zero event leakage between organizations (Acme vs Apex)', async () => {
    const acmeClient = createClient(ALEX_TOKEN, ACME_TENANT_ID);
    const apexClient = createClient(MARCUS_TOKEN, APEX_TENANT_ID);

    await new Promise((resolve) => {
      let readyCount = 0;
      const onReady = () => {
        readyCount++;
        if (readyCount === 2) resolve();
      };
      acmeClient.on('connection:ready', onReady);
      apexClient.on('connection:ready', onReady);
    });

    let apexReceivedEvent = false;
    apexClient.on('test:org_event', () => {
      apexReceivedEvent = true;
    });

    const acmeReceivedPromise = new Promise((resolve, reject) => {
      acmeClient.on('test:org_event', (envelope) => {
        try {
          assert.equal(envelope.organizationId, ACME_TENANT_ID);
          assert.equal(envelope.data.secret, 'acme-confidential-data');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    // Emit event strictly to ACME organization
    notificationService.emitToOrganization(ACME_TENANT_ID, 'test:org_event', {
      data: { secret: 'acme-confidential-data' }
    });

    await acmeReceivedPromise;

    // Small delay to verify Apex NEVER received the event
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(apexReceivedEvent, false, 'Apex client must not receive Acme events!');

    acmeClient.disconnect();
    apexClient.disconnect();
  });

  // =========================================================================
  // 5. User-Specific Private Room Isolation
  // =========================================================================

  await t.test('User private room delivers in-app notifications only to targeted user', async () => {
    const alexClient = createClient(ALEX_TOKEN, ACME_TENANT_ID);
    const sarahClient = createClient(SARAH_TOKEN, ACME_TENANT_ID);

    await new Promise((resolve) => {
      let count = 0;
      const ready = () => {
        if (++count === 2) resolve();
      };
      alexClient.on('connection:ready', ready);
      sarahClient.on('connection:ready', ready);
    });

    let alexReceived = false;
    alexClient.on('notification:new', () => {
      alexReceived = true;
    });

    const sarahReceivedPromise = new Promise((resolve, reject) => {
      sarahClient.on('notification:new', (envelope) => {
        try {
          assert.equal(envelope.organizationId, ACME_TENANT_ID);
          assert.equal(envelope.notification.title, 'Confidential Staff Review');
          assert.equal(envelope.notification.user_id, SARAH_USER_ID);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    // Send private notification to Sarah only
    await notificationService.createNotification({
      organizationId: ACME_TENANT_ID,
      userId: SARAH_USER_ID,
      title: 'Confidential Staff Review',
      message: 'Your Q4 performance review is ready to sign.',
      type: 'info'
    });

    await sarahReceivedPromise;
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(alexReceived, false, 'Alex must not receive Sarah private notification');

    alexClient.disconnect();
    sarahClient.disconnect();
  });

  // =========================================================================
  // 6. Duplicate Event Prevention
  // =========================================================================

  await t.test('Server suppresses duplicate event dispatch with identical eventId', async () => {
    const client = createClient(ALEX_TOKEN, ACME_TENANT_ID);

    await new Promise((resolve) => client.on('connection:ready', resolve));

    let receivedCount = 0;
    client.on('notification:new', () => {
      receivedCount++;
    });

    const fixedEventId = 'fixed-test-uuid-999999';

    // Dispatch first time
    const notif1 = await notificationService.createNotification({
      organizationId: ACME_TENANT_ID,
      userId: ALEX_USER_ID,
      title: 'Idempotency Test 1',
      message: 'First attempt',
      data: { eventId: fixedEventId }
    });
    assert.ok(notif1, 'First notification should succeed');

    // Dispatch second time with same eventId
    const notif2 = await notificationService.createNotification({
      organizationId: ACME_TENANT_ID,
      userId: ALEX_USER_ID,
      title: 'Idempotency Test 2',
      message: 'Duplicate attempt',
      data: { eventId: fixedEventId }
    });
    assert.equal(notif2, null, 'Duplicate event must be dropped');

    await new Promise((r) => setTimeout(r, 150));
    assert.equal(receivedCount, 1, 'Client should have received only 1 event');

    client.disconnect();
  });

  // =========================================================================
  // 7. Notification REST API Endpoints
  // =========================================================================

  let createdNotificationId = null;

  await t.test('GET /api/v1/notifications lists user notifications with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);

    if (res.body.data.length > 0) {
      createdNotificationId = res.body.data[0].id;
    }
  });

  await t.test('GET /api/v1/notifications/unread-count returns unread count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.unreadCount, 'number');
  });

  await t.test('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
    if (!createdNotificationId) return;

    const res = await request(app)
      .patch(`/api/v1/notifications/${createdNotificationId}/read`)
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_read, true);
    assert.ok(res.body.data.read_at);
  });

  await t.test('POST /api/v1/notifications/mark-all-read marks all as read', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(countRes.body.data.unreadCount, 0);
  });

  await t.test('DELETE /api/v1/notifications/:id removes notification', async () => {
    if (!createdNotificationId) return;

    const res = await request(app)
      .delete(`/api/v1/notifications/${createdNotificationId}`)
      .set('Authorization', `Bearer ${ALEX_TOKEN}`)
      .set('X-Tenant-Id', ACME_TENANT_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  // =========================================================================
  // 8. Domain Real-Time Event Dispatch
  // =========================================================================

  await t.test('Domain Event: notifyTaskAssigned emits task:assigned event', async () => {
    const client = createClient(ALEX_TOKEN, ACME_TENANT_ID);
    await new Promise((resolve) => client.on('connection:ready', resolve));

    const eventPromise = new Promise((resolve, reject) => {
      client.on('task:assigned', (envelope) => {
        try {
          assert.equal(envelope.organizationId, ACME_TENANT_ID);
          assert.equal(envelope.task.title, 'Fix HVAC Motor');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    await notificationService.notifyTaskAssigned({
      organizationId: ACME_TENANT_ID,
      task: { id: 'tsk-hvac', title: 'Fix HVAC Motor', priority: 'high' },
      assignedUserId: ALEX_USER_ID,
      assignedByName: 'Sarah Ops'
    });

    await eventPromise;
    client.disconnect();
  });

  await t.test('Domain Event: notifyExpenseReviewed emits expense:status_updated to managers', async () => {
    const client = createClient(SARAH_TOKEN, ACME_TENANT_ID);
    await new Promise((resolve) => client.on('connection:ready', resolve));

    const eventPromise = new Promise((resolve, reject) => {
      client.on('expense:status_updated', (envelope) => {
        try {
          assert.equal(envelope.organizationId, ACME_TENANT_ID);
          assert.equal(envelope.status, 'approved');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    await notificationService.notifyExpenseReviewed({
      organizationId: ACME_TENANT_ID,
      expense: { id: 'exp-123', claim_code: 'EXP-900', amount: 150.0, user_id: ALEX_USER_ID },
      reviewerName: 'Alex Director',
      status: 'approved'
    });

    await eventPromise;
    client.disconnect();
  });
});
