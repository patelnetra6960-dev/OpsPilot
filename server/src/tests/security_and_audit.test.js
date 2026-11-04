import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { clearRevokedTokens } from '../middleware/authMiddleware.js';
import {
  TEST_PERSONAS,
  TEST_TENANTS,
  makeAuthHeaders,
  assertSuccessEnvelope,
  assertPaginatedEnvelope,
  assertErrorEnvelope
} from './testUtils.js';
import { redactSensitive } from '../utils/redact.js';
import { validateEnv } from '../config/env.js';
import { validateStorageUpload } from '../utils/supabaseHelpers.js';
import { createRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { auditService } from '../services/audit.service.js';
import { ForbiddenError } from '../utils/errors.js';

test('PROMPT 16 — Backend Security, Logging & Audit Infrastructure Test Suite', async (t) => {
  const { ALEX, SARAH, DAVID, RACHEL, MARCUS } = TEST_PERSONAS;
  const { ACME, APEX } = TEST_TENANTS;

  t.beforeEach(() => {
    clearRevokedTokens();
  });

  // ==========================================
  // 1. SENSITIVE DATA REDACTION & NO LEAKAGE
  // ==========================================
  await t.test('1. Sensitive Data Redaction & Secret Leakage Prevention', async (t2) => {
    await t2.test('1.1 Redacts password, secret, token, and API key fields from objects', () => {
      const sensitiveData = {
        username: 'admin',
        password: 'SuperSecretPassword123!',
        service_role: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        apiKey: 'sk_live_123456789',
        nested: {
          refreshToken: 'refresh-abc-xyz',
          publicName: 'Safe Name'
        }
      };

      const clean = redactSensitive(sensitiveData);
      assert.equal(clean.username, 'admin');
      assert.equal(clean.password, '[REDACTED]');
      assert.equal(clean.service_role, '[REDACTED]');
      assert.equal(clean.apiKey, '[REDACTED]');
      assert.equal(clean.nested.refreshToken, '[REDACTED]');
      assert.equal(clean.nested.publicName, 'Safe Name');
    });

    await t2.test('1.2 Redacts raw Bearer JWT strings', () => {
      const rawBearer =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w';
      const clean = redactSensitive(rawBearer);
      assert.equal(clean, 'Bearer [REDACTED_JWT]');
    });

    await t2.test('1.3 Handles circular references safely without infinite recursion', () => {
      const circularObj = { name: 'Parent' };
      circularObj.self = circularObj;

      const clean = redactSensitive(circularObj);
      assert.equal(clean.name, 'Parent');
      assert.equal(clean.self, '[CIRCULAR_REF]');
    });
  });

  // ==========================================
  // 2. CORRELATION IDS & REQUEST TRACING
  // ==========================================
  await t.test('2. Request Correlation IDs & Distributed Tracing', async (t2) => {
    await t2.test('2.1 Echoes incoming X-Correlation-Id header in response', async () => {
      const customId = 'trace-corr-id-987654';
      const res = await request(app).get('/api/health').set('X-Correlation-Id', customId);

      assert.equal(res.status, 200);
      assert.equal(res.headers['x-correlation-id'], customId);
      assert.equal(res.headers['x-request-id'], customId);
      assert.equal(res.body.meta.requestId, customId);
    });

    await t2.test('2.2 Generates new UUID when no correlation header is provided', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.ok(res.headers['x-correlation-id']);
      assert.ok(res.headers['x-request-id']);
      assert.equal(res.headers['x-correlation-id'], res.headers['x-request-id']);
      assert.equal(res.body.meta.requestId, res.headers['x-correlation-id']);
    });
  });

  // ==========================================
  // 3. SECURE RESPONSE HEADERS
  // ==========================================
  await t.test('3. Hardened Security Response Headers (Helmet & Server Hardening)', async (t2) => {
    await t2.test('3.1 Enforces nosniff, frameguard, HSTS, and removes x-powered-by', async () => {
      const res = await request(app).get('/api/health');

      assert.equal(res.status, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
      assert.ok(res.headers['strict-transport-security']);
      assert.equal(res.headers['x-powered-by'], undefined);
    });
  });

  // ==========================================
  // 4. API RATE LIMITING
  // ==========================================
  await t.test('4. Production Rate Limiting Infrastructure', async (t2) => {
    await t2.test(
      '4.1 Rejects traffic exceeding window threshold with HTTP 429 and standard headers',
      async () => {
        const customLimiter = createRateLimiter({
          windowMs: 60 * 1000,
          max: 3,
          enableInTest: true,
          keyGenerator: () => 'test-rate-limit-client-ip'
        });

        const mockReq = { ip: '192.168.1.100', headers: {} };
        const headersSent = {};
        const mockRes = {
          setHeader: (k, v) => {
            headersSent[k] = v;
          },
          status: (code) => {
            mockRes.statusCode = code;
            return {
              json: (payload) => {
                mockRes.body = payload;
                return mockRes;
              }
            };
          }
        };

        let nextCount = 0;
        const nextFn = () => {
          nextCount++;
        };

        // Calls 1, 2, 3 succeed
        customLimiter(mockReq, mockRes, nextFn);
        customLimiter(mockReq, mockRes, nextFn);
        customLimiter(mockReq, mockRes, nextFn);
        assert.equal(nextCount, 3);
        assert.equal(headersSent['RateLimit-Limit'], 3);
        assert.equal(headersSent['RateLimit-Remaining'], 0);

        // Call 4 exceeds threshold and receives 429
        customLimiter(mockReq, mockRes, nextFn);
        assert.equal(nextCount, 3); // next not called
        assert.equal(mockRes.statusCode, 429);
        assert.equal(mockRes.body.error.code, 'TOO_MANY_REQUESTS');
        assert.ok(headersSent['Retry-After']);
      }
    );
  });

  // ==========================================
  // 5. SECURE FILE UPLOAD VALIDATION
  // ==========================================
  await t.test('5. File Upload Validation & Path Traversal Guards', async (t2) => {
    await t2.test('5.1 Blocks dangerous executable and script file extensions', () => {
      const dangerousFiles = [
        'payload.exe',
        'exploit.sh',
        'backdoor.php',
        'script.bat',
        'shell.ps1'
      ];
      for (const fileName of dangerousFiles) {
        const result = validateStorageUpload({
          bucket: 'org-documents',
          fileName,
          fileSize: 1024,
          mimeType: 'application/pdf'
        });
        assert.equal(result.isValid, false);
        assert.equal(result.code, 'FORBIDDEN_FILE_EXTENSION');
      }
    });

    await t2.test('5.2 Blocks directory traversal attempts (.. and slashes in filenames)', () => {
      const maliciousNames = ['../../etc/passwd.pdf', '..\\boot.ini', '/root/secrets.pdf'];
      for (const fileName of maliciousNames) {
        const result = validateStorageUpload({
          bucket: 'org-documents',
          fileName,
          fileSize: 1024,
          mimeType: 'application/pdf'
        });
        assert.equal(result.isValid, false);
        assert.ok(
          result.code === 'INVALID_FILE_NAME' || result.code === 'FORBIDDEN_FILE_EXTENSION'
        );
      }
    });

    await t2.test('5.3 Blocks oversized file uploads', () => {
      const result = validateStorageUpload({
        bucket: 'org-assets', // Max 5 MB
        fileName: 'huge-logo.png',
        fileSize: 10 * 1024 * 1024, // 10 MB
        mimeType: 'image/png'
      });
      assert.equal(result.isValid, false);
      assert.equal(result.code, 'FILE_SIZE_LIMIT_EXCEEDED');
    });

    await t2.test('5.4 Blocks disallowed MIME types', () => {
      const result = validateStorageUpload({
        bucket: 'invoice-documents', // Only PDF and Images allowed
        fileName: 'malicious.mp4',
        fileSize: 1024,
        mimeType: 'video/mp4'
      });
      assert.equal(result.isValid, false);
      assert.equal(result.code, 'INVALID_MIME_TYPE');
    });
  });

  // ==========================================
  // 6. ENVIRONMENT CONFIGURATION VALIDATION
  // ==========================================
  await t.test('6. Environment Configuration Schema Validation', async (t2) => {
    await t2.test('6.1 Validates permissible development environment', () => {
      const parsed = validateEnv({
        PORT: '8080',
        NODE_ENV: 'development',
        CLIENT_URL: 'http://localhost:5173',
        SUPABASE_URL: 'https://mock-opspilot.supabase.co',
        SUPABASE_ANON_KEY: 'mock-key',
        SUPABASE_SERVICE_ROLE_KEY: 'mock-key'
      });

      assert.equal(parsed.PORT, 8080);
      assert.equal(parsed.NODE_ENV, 'development');
    });

    await t2.test('6.2 Fails fast when mock keys are supplied in production environment', () => {
      assert.throws(() => {
        validateEnv({
          PORT: '5000',
          NODE_ENV: 'production',
          SUPABASE_URL: 'https://mock-opspilot.supabase.co', // Insecure mock URL in prod
          SUPABASE_ANON_KEY: 'live-key',
          SUPABASE_SERVICE_ROLE_KEY: 'live-key'
        });
      }, /FATAL CONFIGURATION ERROR/);
    });
  });

  // ==========================================
  // 7. MASS ASSIGNMENT PROTECTION
  // ==========================================
  await t.test('7. Mass Assignment Protection on Sensitive & Tenant Fields', async (t2) => {
    await t2.test(
      '7.1 Disallows modifying organization_id, id, or is_superadmin via PATCH',
      async () => {
        // 1. Create customer
        const createRes = await request(app)
          .post('/api/v1/customers')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({
            name: 'Mass Assignment Test Co',
            email: 'mass.assignment@test.com'
          });

        assertSuccessEnvelope(createRes, 201);
        const customerId = createRes.body.data.id;

        // 2. Attempt mass assignment to alter organization_id to APEX and elevate is_superadmin
        const patchRes = await request(app)
          .patch(`/api/v1/customers/${customerId}`)
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({
            organization_id: APEX, // Attacker attempts cross-tenant move
            is_superadmin: true,
            name: 'Sanitized Name'
          });

        assertSuccessEnvelope(patchRes, 200);
        assert.equal(patchRes.body.data.name, 'Sanitized Name');
        assert.equal(patchRes.body.data.organization_id, ACME); // Preserved Acme tenant!
        assert.equal(patchRes.body.data.is_superadmin, undefined);
      }
    );
  });

  // ==========================================
  // 8. SAFE PAGINATION BOUNDARIES
  // ==========================================
  await t.test('8. Safe Pagination Boundaries & DoS Prevention', async (t2) => {
    await t2.test('8.1 Clamps excessive limit parameter to safe maximum of 100', async () => {
      const res = await request(app)
        .get('/api/v1/customers?limit=999999')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(res, 200);
      assert.equal(res.body.pagination.limit, 100);
    });

    await t2.test('8.2 Coerces negative and zero page numbers to 1', async () => {
      const res = await request(app)
        .get('/api/v1/customers?page=-5&limit=10')
        .set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(res, 200);
      assert.equal(res.body.pagination.page, 1);
    });
  });

  // ==========================================
  // 9. AUDIT LOG ACCESS RESTRICTIONS & IMMUTABILITY
  // ==========================================
  await t.test('9. Organization Audit Log Access Controls & Immutability', async (t2) => {
    await t2.test('9.1 Organization Owner can read tenant audit logs (HTTP 200)', async () => {
      // Record a test security event
      await auditService.recordSecurityEvent({
        organizationId: ACME,
        userId: ALEX.user_id,
        action: 'MEMBER_ROLE_CHANGE',
        entityType: 'MEMBERSHIP',
        entityId: 'mem-101',
        oldValues: { role: 'employee', password: 'secret-to-redact' },
        newValues: { role: 'manager' },
        ipAddress: '127.0.0.1'
      });

      const res = await request(app).get('/api/v1/audit').set(makeAuthHeaders(ALEX.token, ACME));

      assertPaginatedEnvelope(res, 200);
      assert.ok(res.body.data.length >= 1);

      // Verify that stored password was redacted
      const roleEvent = res.body.data.find((e) => e.action === 'MEMBER_ROLE_CHANGE');
      assert.ok(roleEvent);
      assert.equal(roleEvent.old_values.password, '[REDACTED]');
    });

    await t2.test(
      '9.2 Manager, Employee, and Customer are FORBIDDEN from reading audit logs (HTTP 403)',
      async () => {
        // Manager forbidden
        const managerRes = await request(app)
          .get('/api/v1/audit')
          .set(makeAuthHeaders(SARAH.token, ACME));
        assertErrorEnvelope(managerRes, 403, 'INSUFFICIENT_ROLE_PERMISSIONS');

        // Employee forbidden
        const employeeRes = await request(app)
          .get('/api/v1/audit')
          .set(makeAuthHeaders(DAVID.token, ACME));
        assertErrorEnvelope(employeeRes, 403, 'INSUFFICIENT_ROLE_PERMISSIONS');

        // Customer forbidden
        const customerRes = await request(app)
          .get('/api/v1/audit')
          .set(makeAuthHeaders(RACHEL.token, ACME));
        assertErrorEnvelope(customerRes, 403, 'INSUFFICIENT_ROLE_PERMISSIONS');
      }
    );

    await t2.test(
      '9.3 Cross-Tenant Isolation: Apex Owner cannot access Acme audit logs',
      async () => {
        const res = await request(app)
          .get('/api/v1/audit')
          .set(makeAuthHeaders(MARCUS.token, ACME));

        assertErrorEnvelope(res, 403, 'FORBIDDEN_CROSS_TENANT_ACCESS');
      }
    );

    await t2.test(
      '9.4 Audit Trail Immutability: Mutating audit logs via API is rejected (HTTP 405)',
      async () => {
        const postRes = await request(app)
          .post('/api/v1/audit')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({ action: 'FORGED_EVENT' });
        assert.equal(postRes.status, 405);

        const patchRes = await request(app)
          .patch('/api/v1/audit/some-id')
          .set(makeAuthHeaders(ALEX.token, ACME))
          .send({ action: 'ALTERED_EVENT' });
        assert.equal(patchRes.status, 405);

        const deleteRes = await request(app)
          .delete('/api/v1/audit/some-id')
          .set(makeAuthHeaders(ALEX.token, ACME));
        assert.equal(deleteRes.status, 405);
      }
    );

    await t2.test(
      '9.5 AuditRepository Immutability: Direct code mutations throw ForbiddenError',
      async () => {
        await assert.rejects(
          async () => {
            await auditRepository.update('some-id', ACME, {});
          },
          (err) => {
            assert.ok(err instanceof ForbiddenError);
            assert.ok(err.message.includes('immutable'));
            return true;
          }
        );

        await assert.rejects(
          async () => {
            await auditRepository.softDelete('some-id', ACME);
          },
          (err) => {
            assert.ok(err instanceof ForbiddenError);
            return true;
          }
        );
      }
    );
  });

  // ==========================================
  // 10. LOGIN & SECURITY EVENT LOGGING
  // ==========================================
  await t.test('10. Login and Security Event Logging Verification', async (t2) => {
    await t2.test(
      '10.1 Successful login records AUTH_LOGIN_SUCCESS security audit event',
      async () => {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: 'alex.director@acme.com',
          password: 'Password123!'
        });

        assertSuccessEnvelope(res, 200);

        // Verify audit log has recorded the event
        const auditRes = await request(app)
          .get('/api/v1/audit?action=AUTH_LOGIN_SUCCESS')
          .set(makeAuthHeaders(ALEX.token, ACME));

        assertPaginatedEnvelope(auditRes, 200);
        assert.ok(auditRes.body.data.some((e) => e.action === 'AUTH_LOGIN_SUCCESS'));
      }
    );
  });
});
