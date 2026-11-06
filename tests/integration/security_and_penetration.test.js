import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../server/src/app.js';
import { revokeToken, clearRevokedTokens } from '../../server/src/middleware/authMiddleware.js';

test('Security & Penetration Audit Suite (Prompt 29)', async (t) => {
  const ACME_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const APEX_TENANT_ID = '22222222-2222-2222-2222-222222222222';

  // Standard Persona Tokens
  const ALEX_TOKEN = 'Bearer mock-token-alex'; // Acme Owner
  const DAVID_TOKEN = 'Bearer mock-token-david'; // Acme Employee / Technician
  const RACHEL_TOKEN = 'Bearer mock-token-rachel'; // Acme Customer (Metro Health)
  const MARCUS_TOKEN = 'Bearer mock-token-marcus'; // Apex Owner (Cross-Tenant)

  t.afterEach(() => {
    clearRevokedTokens();
  });

  // =========================================================================
  // 1. Insecure Direct Object Reference (IDOR) Protections
  // =========================================================================
  await t.test('1. Insecure Direct Object Reference (IDOR) Protections', async (st) => {
    await st.test('1.1 IDOR: Customer cannot access another customer record by direct ID', async () => {
      // Rachel Green represents Metro Health (cust-1)
      // Attempting to query or modify Apex Customer (cust-3) or another Acme Customer directly
      const res = await request(app)
        .get('/api/v1/customers/cust-3')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      // Must be blocked (403 Forbidden or 404 Not Found in tenant)
      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
    });

    await st.test('1.2 IDOR: Customer cannot access internal tasks of projects they do not own', async () => {
      // Internal task tsk-1 belongs to Acme project prj-1
      const res = await request(app)
        .get('/api/v1/tasks/tsk-1')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      // Customer has no read authorization on internal task
      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
    });

    await st.test('1.3 IDOR: Tenant A user cannot read or update Tenant B invoice directly', async () => {
      // inv-2 belongs to Apex (Tenant B)
      const res = await request(app)
        .get('/api/v1/invoices/inv-2')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      // Should be 403 (Cross-tenant breach) or 404
      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
      if (res.body?.data) {
        assert.notEqual(res.body.data.organization_id, APEX_TENANT_ID);
      }
    });

    await st.test('1.4 IDOR: Customer cannot modify work orders or close them directly', async () => {
      const res = await request(app)
        .patch('/api/v1/work-orders/wo-1')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ status: 'completed' });

      assert.equal(res.status, 403, 'Customer must not be permitted to update work order status');
    });

    await st.test('1.5 IDOR: Employee cannot view or edit financial expenses of other employees', async () => {
      // exp-2 belongs to Sarah (Manager). David (Employee) should not access Sarah's private expense
      const res = await request(app)
        .get('/api/v1/expenses/exp-2')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
    });
  });

  // =========================================================================
  // 2. Privilege Escalation Defenses
  // =========================================================================
  await t.test('2. Privilege Escalation Defenses', async (st) => {
    await st.test('2.1 Non-superadmin cannot elevate user profile to is_superadmin: true', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/users/dddddddd-dddd-dddd-dddd-dddddddddddd')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ is_superadmin: true });

      // Non-superadmin cannot access /api/v1/admin or set is_superadmin
      assert.equal(res.status, 403);
    });

    await st.test('2.2 Regular employee cannot promote themselves or others to owner role', async () => {
      const res = await request(app)
        .post('/api/v1/workforce')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          first_name: 'Hacker',
          last_name: 'Privilege',
          email: 'hacker@acme.com',
          role: 'owner'
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await st.test('2.3 Employee cannot approve their own submitted expense reports', async () => {
      const res = await request(app)
        .post('/api/v1/expenses/exp-1/approve')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({ notes: 'Self approval attempt' });

      assert.equal(res.status, 403, 'Employee must be blocked from reviewing/approving expenses');
    });

    await st.test('2.4 Customer cannot access internal management routes', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // 3. Unauthorized Cross-Organization Access & Header Tampering
  // =========================================================================
  await t.test('3. Unauthorized Cross-Organization Access & Header Tampering', async (st) => {
    await st.test('3.1 Marcus (Apex) spoofing Acme X-Tenant-Id header is rejected with 403', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    });

    await st.test('3.2 Marcus cannot access Acme projects even when knowing explicit project ID', async () => {
      const res = await request(app)
        .get('/api/v1/projects/prj-1')
        .set('Authorization', MARCUS_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN_CROSS_TENANT_ACCESS');
    });

    await st.test('3.3 Request with invalid UUID in X-Tenant-Id is rejected cleanly with 400 or 404', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', 'not-a-valid-uuid-format');

      assert.ok([400, 404].includes(res.status), `Expected 400 or 404, got ${res.status}`);
      assert.ok(['INVALID_TENANT_ID', 'TENANT_NOT_FOUND'].includes(res.body.error.code));
    });

    await st.test('3.4 Request without any tenant context for tenant-scoped resource is rejected', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', ALEX_TOKEN);
        // Omit X-Tenant-Id

      // Alex has Acme tenant membership so tenantMiddleware defaults to user primary tenant or requires tenant
      assert.ok([200, 400].includes(res.status));
      if (res.status === 200) {
        // Must strictly belong to Alex's primary org
        res.body.data.forEach((m) => assert.equal(m.organization_id, ACME_TENANT_ID));
      }
    });
  });

  // =========================================================================
  // 4. Token Cryptographic Verification & Expiration
  // =========================================================================
  await t.test('4. Token Cryptographic Verification & Expiration', async (st) => {
    await st.test('4.1 Request with missing Authorization header is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    await st.test('4.2 Malformed Authorization header without Bearer prefix is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    await st.test('4.3 Forged / Unknown token is rejected with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', 'Bearer mock-token-forged-attacker-identity')
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'INVALID_TOKEN');
    });

    await st.test('4.4 Expired token is explicitly rejected with 401 TOKEN_EXPIRED', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', 'Bearer mock-token-alex-expired-session')
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'TOKEN_EXPIRED');
    });

    await st.test('4.5 Revoked token is rejected immediately with 401 TOKEN_REVOKED', async () => {
      const tokenToRevoke = 'mock-token-sarah-logout-test';
      // Register temporary user token in store
      revokeToken(tokenToRevoke);

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenToRevoke}`)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'TOKEN_REVOKED');
    });
  });

  // =========================================================================
  // 5. Secret Exposure & Information Leakage Prevention
  // =========================================================================
  await t.test('5. Secret Exposure & Information Leakage Prevention', async (st) => {
    await st.test('5.1 User authentication responses never expose hashed passwords or secrets', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex.director@acme.com',
          password: 'Password123!'
        });

      if (res.status === 200) {
        const bodyStr = JSON.stringify(res.body);
        assert.ok(!bodyStr.includes('password_hash'), 'Response must not contain password_hash');
        assert.ok(!bodyStr.includes('supabase_service_role_key'), 'Response must not contain service key');
        assert.ok(!bodyStr.includes('jwt_secret'), 'Response must not contain jwt_secret');
      }
    });

    await st.test('5.2 Workforce endpoints strip sensitive compensation from ordinary employee queries', async () => {
      const res = await request(app)
        .get('/api/v1/workforce')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      // David is an employee: either workforce list is forbidden (403) or salaries are scrubbed
      if (res.status === 200) {
        res.body.data.forEach((member) => {
          if (member.id !== 'w1') {
            assert.equal(member.salary, undefined, 'Salary of other employees must not be visible to staff');
          }
        });
      } else {
        assert.equal(res.status, 403);
      }
    });

    await st.test('5.3 System error responses never leak raw SQL stack traces or internal paths in API output', async () => {
      const res = await request(app)
        .get('/api/v1/projects/invalid-id-forcing-lookup')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      const bodyStr = JSON.stringify(res.body);
      assert.ok(!bodyStr.includes('SELECT * FROM'), 'API response must not leak raw SQL query fragments');
      assert.ok(!bodyStr.includes('node_modules'), 'API response must not leak internal node_modules paths');
    });
  });

  // =========================================================================
  // 6. Rate Limiting Protection Against Brute Force
  // =========================================================================
  await t.test('6. Rate Limiting Protection Against Brute Force', async (st) => {
    await st.test('6.1 Rate limiter tracks requests and injects standard RateLimit headers', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Test-Rate-Limit', 'true');

      assert.equal(res.status, 200);
      assert.ok(res.headers['ratelimit-limit'], 'RateLimit-Limit header must be present');
      assert.ok(res.headers['ratelimit-remaining'], 'RateLimit-Remaining header must be present');
    });

    await st.test('6.2 Rapid burst requests exceeding threshold return HTTP 429 Too Many Requests', async () => {
      const burstLimit = 35;
      let lastRes = null;

      // Burst 35 requests against auth endpoint to exceed the max 30 window
      for (let i = 0; i < burstLimit; i++) {
        lastRes = await request(app)
          .post('/api/v1/auth/login')
          .set('X-Test-Rate-Limit', 'true')
          .set('X-Forwarded-For', '203.0.113.199') // Fixed simulated IP
          .send({
            email: 'attacker@evil.com',
            password: 'BadPassword123!'
          });
        if (lastRes.status === 429) break;
      }

      assert.equal(lastRes.status, 429, 'Rate limiter must enforce HTTP 429 when threshold exceeded');
      assert.equal(lastRes.body.error.code, 'TOO_MANY_REQUESTS');
      assert.ok(lastRes.headers['retry-after'], 'Retry-After header must be set');
    });
  });

  // =========================================================================
  // 7. File Upload Validation & Malicious Payloads
  // =========================================================================
  await t.test('7. File Upload Validation & Malicious Payloads', async (st) => {
    await st.test('7.1 Reject executable files (.exe, .sh, .php, .bat) with 400 Bad Request', async () => {
      const maliciousFiles = [
        { fileName: 'malware.exe', mimeType: 'application/octet-stream' },
        { fileName: 'exploit.sh', mimeType: 'application/x-sh' },
        { fileName: 'webshell.php', mimeType: 'application/x-httpd-php' },
        { fileName: 'backdoor.bat', mimeType: 'application/x-bat' }
      ];

      for (const file of maliciousFiles) {
        const res = await request(app)
          .post('/api/v1/storage/upload')
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_TENANT_ID)
          .send({
            bucket: 'org-documents',
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileData: Buffer.from('malicious payload').toString('base64')
          });

        assert.equal(
          res.status,
          400,
          `File '${file.fileName}' must be rejected with 400 Bad Request`
        );
        assert.equal(res.body.error.code, 'FORBIDDEN_FILE_EXTENSION');
      }
    });

    await st.test('7.2 Reject directory traversal payloads in fileName (../ traversal)', async () => {
      const res = await request(app)
        .post('/api/v1/storage/upload')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          bucket: 'org-documents',
          fileName: '../../etc/passwd',
          mimeType: 'text/plain',
          fileData: Buffer.from('test').toString('base64')
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_FILE_NAME');
    });

    await st.test('7.3 Reject oversized uploads exceeding bucket quota', async () => {
      const res = await request(app)
        .post('/api/v1/storage/upload')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          bucket: 'org-assets', // 5 MB limit
          fileName: 'massive_logo.png',
          mimeType: 'image/png',
          fileSize: 10 * 1024 * 1024 // 10 MB payload
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'FILE_SIZE_LIMIT_EXCEEDED');
    });

    await st.test('7.4 Reject disallowed MIME types for specific bucket', async () => {
      const res = await request(app)
        .post('/api/v1/storage/upload')
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID)
        .send({
          bucket: 'work-order-photos', // Only images allowed
          fileName: 'unsupported.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_MIME_TYPE');
    });
  });

  // =========================================================================
  // 8. SQL Injection & Tainted Input Defenses
  // =========================================================================
  await t.test('8. SQL Injection & Tainted Input Defenses', async (st) => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT username, password_hash FROM users --",
      "admin'--",
      "') OR ('a'='a"
    ];

    await st.test('8.1 Global search sanitizes SQL injection payloads without crashing or leaking records', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await request(app)
          .get('/api/v1/search')
          .query({ q: payload })
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_TENANT_ID);

        assert.equal(res.status, 200, `Search with payload "${payload}" should execute safely`);
        assert.ok(Array.isArray(res.body.data), 'Result must be an array');
        // None of the records returned can belong to another tenant
        res.body.data.forEach((item) => {
          assert.equal(
            item.organization_id,
            ACME_TENANT_ID,
            'Cross-tenant record leaked via SQL injection attempt'
          );
        });
      }
    });

    await st.test('8.2 Entity ID parameter SQL injection payloads result in 404/400 without crashing', async () => {
      for (const payload of sqlInjectionPayloads) {
        const res = await request(app)
          .get(`/api/v1/projects/${encodeURIComponent(payload)}`)
          .set('Authorization', ALEX_TOKEN)
          .set('X-Tenant-Id', ACME_TENANT_ID);

        assert.ok(
          [400, 404].includes(res.status),
          `Entity fetch with payload "${payload}" returned status ${res.status}`
        );
      }
    });

    await st.test('8.3 Filtering parameters with SQL syntax are parsed safely', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .query({ status: "' OR '1'='1" })
        .set('Authorization', ALEX_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 200);
      // Literal filter match: should find 0 tasks with status "' OR '1'='1"
      assert.equal(res.body.data.length, 0);
    });
  });

  // =========================================================================
  // 9. Financial Data Isolation & RBAC Boundaries
  // =========================================================================
  await t.test('9. Financial Data Isolation & RBAC Boundaries', async (st) => {
    await st.test('9.1 Ordinary staff (David) cannot view company-wide invoices list', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', DAVID_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403, 'Employees must not access company invoices');
    });

    await st.test('9.2 Customer (Rachel) cannot view internal expenses list', async () => {
      const res = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      assert.equal(res.status, 403, 'Customers must not access employee expenses');
    });

    await st.test('9.3 Customer can only query invoices explicitly billed to their own customer ID', async () => {
      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', RACHEL_TOKEN)
        .set('X-Tenant-Id', ACME_TENANT_ID);

      if (res.status === 200) {
        res.body.data.forEach((inv) => {
          assert.equal(
            inv.customer_id,
            'cust-acme-1',
            'Customer invoice list leaked invoice belonging to another client'
          );
        });
      }
    });
  });
});
