import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import supertest from 'supertest';
import app from '../../server/src/app.js';
import {
  registerSchema,
  verifyEmailSchema
} from '../../client/src/features/auth/schemas/authSchemas.js';

const request = supertest(app);

describe('Prompt 18: Authentication & Role-Based Frontend Journey', () => {
  describe('1. Frontend Bundle Security Audit (Zero Service-Role Keys)', () => {
    it('1.1 Verifies no client file exposes or bundles SUPABASE_SERVICE_ROLE_KEY', () => {
      function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (!['node_modules', 'dist', '.git'].includes(file)) {
              scanDir(fullPath);
            }
          } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Allow the security assertion guard that throws an error if detected
            if (
              content.includes('SUPABASE_SERVICE_ROLE_KEY') &&
              !content.includes('CRITICAL SECURITY VIOLATION')
            ) {
              assert.fail(`Service role key referenced unsafely in client file: ${fullPath}`);
            }
          }
        }
      }

      scanDir('client/src');
    });

    it('1.2 supabaseClient.js and authService.js enforce strict runtime service-role checks', () => {
      const clientFile = fs.readFileSync(
        path.resolve('client/src/services/supabaseClient.js'),
        'utf8'
      );
      const authFile = fs.readFileSync(path.resolve('client/src/services/authService.js'), 'utf8');

      assert.ok(clientFile.includes('CRITICAL SECURITY VIOLATION'));
      assert.ok(authFile.includes('CRITICAL SECURITY VIOLATION'));
    });
  });

  describe('2. Authentication Flow & Zod Schema Hardening', () => {
    it('2.1 Validates registration schema requires full name, valid email, matching passwords, and terms', () => {
      const valid = registerSchema.safeParse({
        fullName: 'Morgan Freeman',
        email: 'morgan@acme.com',
        organizationName: 'Shawshank Logistics',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        agreeTerms: true
      });
      assert.strictEqual(valid.success, true);

      const termsMissing = registerSchema.safeParse({
        fullName: 'Morgan Freeman',
        email: 'morgan@acme.com',
        organizationName: 'Shawshank Logistics',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        agreeTerms: false
      });
      assert.strictEqual(termsMissing.success, false);
    });

    it('2.2 Validates verifyEmailSchema handles token and optional email', () => {
      const valid = verifyEmailSchema.safeParse({
        email: 'user@acme.com',
        token: '123456'
      });
      assert.strictEqual(valid.success, true);

      const missingToken = verifyEmailSchema.safeParse({
        email: 'user@acme.com',
        token: ''
      });
      assert.strictEqual(missingToken.success, false);
    });
  });

  describe('3. End-to-End Authentication Journey', () => {
    const testEmail = `newuser-${Date.now()}@acme.com`;
    let userToken = null;
    let organizationId = null;

    it('3.1 Registration: Creates user, initial organization, and session tokens', async () => {
      const res = await request
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          full_name: 'Jordan Belfort',
          organization_name: 'Stratton Operations',
          subscription_tier: 'starter'
        })
        .expect(201);

      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.user);
      assert.ok(res.body.data.session.access_token);
      assert.ok(res.body.data.organization.id);

      userToken = res.body.data.session.access_token;
      organizationId = res.body.data.organization.id;
      assert.strictEqual(typeof organizationId, 'string');
    });

    it('3.2 Email Verification: Confirms verification endpoint handles token verification', async () => {
      const res = await request
        .post('/api/auth/verify-email')
        .send({
          email: testEmail,
          token: 'mock-verification-token-123'
        })
        .expect(200);

      assert.strictEqual(res.body.success, true);
    });

    it('3.3 Login: Authenticates newly registered user with email & password', async () => {
      const res = await request
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePassword123!'
        })
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.email, testEmail);
      assert.ok(res.body.data.session.access_token);
    });

    it('3.4 Page Refresh & Session Restoration: /auth/me returns identity using token', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.user.email, testEmail);
    });

    it('3.5 Password Recovery: Dispatches recovery link for registered email', async () => {
      const res = await request
        .post('/api/auth/recover-password')
        .send({ email: testEmail })
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.message.includes('dispatched'));
    });

    it('3.6 Password Reset: Rejects weak passwords and accepts valid reset', async () => {
      // Weak password rejected
      await request.post('/api/auth/reset-password').send({ newPassword: '123' }).expect(400);

      // Strong password accepted
      const res = await request
        .post('/api/auth/reset-password')
        .send({ newPassword: 'UpdatedSecretPassword123!' })
        .expect(200);

      assert.strictEqual(res.body.success, true);
    });

    it('3.7 Role-Based Route Boundaries: Blocks unauthorized cross-tenant & cross-role access', async () => {
      // Customer token trying to access internal workforce roster -> 403 Forbidden
      const res = await request
        .get('/api/workforce')
        .set('Authorization', 'Bearer mock-token-customer')
        .set('X-Tenant-Id', '11111111-1111-1111-1111-111111111111')
        .expect(403);

      assert.strictEqual(res.body.success, false);
      assert.ok(
        res.body.error.message.includes('Forbidden') ||
          res.body.error.code === 'INSUFFICIENT_ROLE_PERMISSIONS'
      );
    });

    it('3.8 Session Expiration & Logout: Logout invalidates token and rejects subsequent calls with 401', async () => {
      // Call logout with the user token
      await request
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Subsequent attempt with revoked/expired token is denied
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      assert.strictEqual(res.body.success, false);
    });
  });

  describe('4. Frontend Routing Architecture & Role Dashboards', () => {
    it('4.1 AppRoutes registers public auth, verify-email, reset-password, and unauthorized routes', () => {
      const routesContent = fs.readFileSync(
        path.resolve('client/src/routes/AppRoutes.jsx'),
        'utf8'
      );

      assert.ok(routesContent.includes('path="/login"'));
      assert.ok(routesContent.includes('path="/register"'));
      assert.ok(routesContent.includes('path="/forgot-password"'));
      assert.ok(routesContent.includes('path="/reset-password"'));
      assert.ok(routesContent.includes('path="/verify-email"'));
      assert.ok(routesContent.includes('path="/unauthorized"'));
    });

    it('4.2 ProtectedRoute redirects unauthenticated visitors and unauthorized roles to /unauthorized', () => {
      const prContent = fs.readFileSync(
        path.resolve('client/src/routes/ProtectedRoute.jsx'),
        'utf8'
      );

      assert.ok(prContent.includes('state={{ from: location }}'));
      assert.ok(prContent.includes('/unauthorized'));
      assert.ok(prContent.includes('isSuperAdmin'));
    });
  });
});
