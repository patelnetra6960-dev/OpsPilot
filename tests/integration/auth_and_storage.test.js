import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';

test('Integration Test: Supabase Authentication, Storage & Database Services', async (t) => {
  const ACME_ORG_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_ORG_ID = '22222222-2222-2222-2222-222222222222';

  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const SARAH_TOKEN = 'Bearer mock-token-sarah'; // Acme Manager
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner

  // -------------------------------------------------------------------
  // 1. Authentication Integration Endpoints
  // -------------------------------------------------------------------
  await t.test('1.1 Auth: Registers a new user and provisions their organization', async () => {
    const payload = {
      email: 'new.founder@nexusops.com',
      password: 'SecurePassword123!',
      full_name: 'Jordan Sterling',
      organization_name: 'Nexus Operations Group',
      subscription_tier: 'growth'
    };

    const res = await request(app).post('/api/auth/register').send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.equal(res.body.data.user.email, 'new.founder@nexusops.com');
    assert.ok(res.body.data.session.access_token);
    assert.equal(res.body.data.organization.name, 'Nexus Operations Group');
  });

  await t.test('1.2 Auth: Rejects registration with weak password (<8 chars)', async () => {
    const payload = {
      email: 'weak.user@test.com',
      password: '123',
      full_name: 'Weak Pass User'
    };

    const res = await request(app).post('/api/auth/register').send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'WEAK_PASSWORD');
  });

  await t.test('1.3 Auth: Rejects duplicate email registration with 409 Conflict', async () => {
    const payload = {
      email: 'alex.director@acme.com', // Pre-existing in mockDatabase
      password: 'StrongPassword123!',
      full_name: 'Alex Duplicate'
    };

    const res = await request(app).post('/api/auth/register').send(payload);

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT_DUPLICATE_USER');
  });

  await t.test(
    '1.4 Auth: Successful login returns session tokens and affiliated orgs',
    async () => {
      const payload = {
        email: 'alex.director@acme.com',
        password: 'correct-password'
      };

      const res = await request(app).post('/api/auth/login').send(payload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.session.access_token);
      assert.equal(res.body.data.user.email, 'alex.director@acme.com');
      assert.ok(Array.isArray(res.body.data.organizations));
      assert.equal(res.body.data.organizations[0].id, ACME_ORG_ID);
    }
  );

  await t.test('1.5 Auth: Login rejects unknown user with 401 Unauthorized', async () => {
    const payload = {
      email: 'nonexistent.user@unknown.com',
      password: 'anyPassword123!'
    };

    const res = await request(app).post('/api/auth/login').send(payload);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('1.6 Auth: Password recovery and reset flow', async () => {
    // 1. Recover password
    const recRes = await request(app)
      .post('/api/auth/recover-password')
      .send({ email: 'alex.director@acme.com' });

    assert.equal(recRes.status, 200);
    assert.equal(recRes.body.success, true);

    // 2. Reset password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'BrandNewSecurePassword2026!' });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);
  });

  await t.test('1.7 Auth: Token refresh returns new session credentials', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refresh_token: 'valid-refresh-token-mock' });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.access_token);
    assert.ok(res.body.data.refresh_token);
  });

  await t.test('1.8 Auth: /api/auth/me returns profile and affiliated organizations', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', ALEX_TOKEN);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'alex.director@acme.com');
    assert.ok(Array.isArray(res.body.data.organizations));
  });

  // -------------------------------------------------------------------
  // 2. Storage Integration Endpoints & Multi-Tenant Partitioning
  // -------------------------------------------------------------------
  let uploadedFilePath = '';

  await t.test('2.1 Storage Upload: Manager uploads document to org-documents', async () => {
    const payload = {
      bucket: 'org-documents',
      category: 'compliance',
      fileName: 'safety-inspection-2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 45000,
      fileData: Buffer.from('PDF Mock Content').toString('base64')
    };

    const res = await request(app)
      .post('/api/storage/upload')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.bucket, 'org-documents');
    assert.ok(res.body.data.signedUrl);
    assert.ok(res.body.data.storagePath.startsWith(`${ACME_ORG_ID}/compliance/`));

    uploadedFilePath = res.body.data.storagePath;
  });

  await t.test('2.2 Storage Upload: Missing X-Tenant-Id returns 400 Bad Request', async () => {
    const payload = {
      bucket: 'org-documents',
      fileName: 'no-tenant.pdf'
    };

    const res = await request(app)
      .post('/api/storage/upload')
      .set('Authorization', SARAH_TOKEN)
      .send(payload);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'TENANT_HEADER_REQUIRED');
  });

  await t.test('2.3 Storage Signed URL: Generates time-limited download URL', async () => {
    const payload = {
      bucket: 'org-documents',
      filePath: uploadedFilePath,
      expiresIn: 600
    };

    const res = await request(app)
      .post('/api/storage/signed-url')
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID)
      .send(payload);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.signedUrl);
    assert.ok(res.body.data.expiresAt);
  });

  await t.test(
    '2.4 Cross-Tenant Storage Breach: User Marcus (Apex) CANNOT access Acme storage file',
    async () => {
      const payload = {
        bucket: 'org-documents',
        filePath: uploadedFilePath // Belongs to Acme
      };

      const res = await request(app)
        .post('/api/storage/signed-url')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', APEX_ORG_ID)
        .send(payload);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    }
  );

  await t.test(
    '2.5 Customer Storage Boundary: Customer CANNOT upload to or access org-documents',
    async () => {
      // 1. Customer upload attempt to org-documents -> 403
      const uploadRes = await request(app)
        .post('/api/storage/upload')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({
          bucket: 'org-documents',
          fileName: 'customer-hack.pdf',
          mimeType: 'application/pdf'
        });

      assert.equal(uploadRes.status, 403);
      assert.equal(uploadRes.body.error.code, 'FORBIDDEN_STORAGE_ACTION');

      // 2. Customer signed URL request for internal org-documents -> 403
      const signedRes = await request(app)
        .post('/api/storage/signed-url')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_ORG_ID)
        .send({
          bucket: 'org-documents',
          filePath: uploadedFilePath
        });

      assert.equal(signedRes.status, 403);
      assert.equal(signedRes.body.error.code, 'FORBIDDEN_STORAGE_ACTION');
    }
  );

  await t.test('2.6 Storage Deletion Privilege: Employee CANNOT delete storage files', async () => {
    const res = await request(app)
      .delete(`/api/storage/org-documents/${uploadedFilePath}`)
      .set('Authorization', DAVID_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'INSUFFICIENT_ROLE_PERMISSIONS');
  });

  await t.test('2.7 Storage Deletion: Manager or Owner can successfully delete file', async () => {
    const res = await request(app)
      .delete(`/api/storage/org-documents/${uploadedFilePath}`)
      .set('Authorization', SARAH_TOKEN)
      .set('X-Tenant-Id', ACME_ORG_ID);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
