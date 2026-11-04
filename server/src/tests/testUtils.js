import assert from 'node:assert/strict';
import request from 'supertest';

/**
 * Standard Canonical Personas and Tokens for OpsPilot Test Suites
 */
export const TEST_PERSONAS = {
  ALEX: {
    token: 'Bearer mock-token-alex',
    role: 'owner',
    tenantId: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Rivera'
  },
  SARAH: {
    token: 'Bearer mock-token-sarah',
    role: 'manager',
    tenantId: '11111111-1111-1111-1111-111111111111',
    name: 'Sarah Chen'
  },
  DAVID: {
    token: 'Bearer mock-token-david',
    role: 'employee',
    tenantId: '11111111-1111-1111-1111-111111111111',
    name: 'David Miller'
  },
  RACHEL: {
    token: 'Bearer mock-token-rachel',
    role: 'customer',
    tenantId: '11111111-1111-1111-1111-111111111111',
    name: 'Rachel Green'
  },
  MARCUS: {
    token: 'Bearer mock-token-marcus',
    role: 'owner',
    tenantId: '22222222-2222-2222-2222-222222222222',
    name: 'Marcus Vance'
  },
  VICTORIA: {
    token: 'Bearer mock-token-victoria',
    role: 'superadmin',
    is_superadmin: true,
    name: 'Victoria Root'
  }
};

export const TEST_TENANTS = {
  ACME: '11111111-1111-1111-1111-111111111111',
  APEX: '22222222-2222-2222-2222-222222222222'
};

/**
 * Creates headers object with Authorization and optional Tenant ID
 */
export const makeAuthHeaders = (token, tenantId = null) => ({
  Authorization: token,
  ...(tenantId && { 'X-Tenant-Id': tenantId })
});

/**
 * Asserts standard API success response envelope
 */
export const assertSuccessEnvelope = (res, expectedStatus = 200) => {
  assert.equal(
    res.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus} but received ${res.status}: ${JSON.stringify(res.body)}`
  );
  assert.equal(res.body.success, true, 'Expected res.body.success to be true');
  assert.ok(res.body.data !== undefined, 'Expected res.body.data to be present');
  assert.ok(res.body.meta, 'Expected res.body.meta to be present');
  assert.ok(res.body.meta.timestamp, 'Expected res.body.meta.timestamp');
  assert.ok(res.body.meta.requestId, 'Expected res.body.meta.requestId');
};

/**
 * Asserts standard API paginated response envelope
 */
export const assertPaginatedEnvelope = (res, expectedStatus = 200) => {
  assertSuccessEnvelope(res, expectedStatus);
  assert.ok(Array.isArray(res.body.data), 'Expected res.body.data to be an array');
  assert.ok(res.body.pagination, 'Expected res.body.pagination to be present');
  assert.ok(typeof res.body.pagination.page === 'number', 'Expected pagination.page');
  assert.ok(typeof res.body.pagination.limit === 'number', 'Expected pagination.limit');
  assert.ok(typeof res.body.pagination.total === 'number', 'Expected pagination.total');
  assert.ok(typeof res.body.pagination.totalPages === 'number', 'Expected pagination.totalPages');
  assert.ok(
    typeof res.body.pagination.hasNextPage === 'boolean',
    'Expected pagination.hasNextPage boolean'
  );
  assert.ok(
    typeof res.body.pagination.hasPrevPage === 'boolean',
    'Expected pagination.hasPrevPage boolean'
  );
};

/**
 * Asserts standard API error response envelope
 */
export const assertErrorEnvelope = (res, expectedStatus, expectedErrorCode = null) => {
  assert.equal(
    res.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus} but received ${res.status}: ${JSON.stringify(res.body)}`
  );
  assert.equal(res.body.success, false, 'Expected res.body.success to be false');
  assert.ok(res.body.error, 'Expected res.body.error object');
  assert.ok(res.body.error.message, 'Expected res.body.error.message');
  if (expectedErrorCode) {
    assert.equal(
      res.body.error.code,
      expectedErrorCode,
      `Expected error.code '${expectedErrorCode}' but received '${res.body.error.code}'`
    );
  }
  assert.ok(res.body.meta, 'Expected res.body.meta');
  assert.ok(res.body.meta.timestamp, 'Expected res.body.meta.timestamp');
};

/**
 * Asserts that an unauthenticated request is rejected with 401 UNAUTHORIZED
 */
export const assertRequiresAuth = async (app, method, url) => {
  const res = await request(app)[method.toLowerCase()](url);
  assertErrorEnvelope(res, 401, 'UNAUTHORIZED');
};

/**
 * Asserts that a missing X-Tenant-Id header is rejected with 400 TENANT_HEADER_REQUIRED
 */
export const assertRequiresTenantHeader = async (app, method, url, token) => {
  const res = await request(app)[method.toLowerCase()](url).set('Authorization', token);
  assertErrorEnvelope(res, 400, 'TENANT_HEADER_REQUIRED');
};

/**
 * Asserts that a user from Tenant B cannot access Tenant A resources
 */
export const assertBlocksCrossTenantAccess = async (
  app,
  method,
  url,
  foreignToken,
  targetTenantId
) => {
  const res = await request(app)
    [method.toLowerCase()](url)
    .set('Authorization', foreignToken)
    .set('X-Tenant-Id', targetTenantId);
  assertErrorEnvelope(res, 403, 'FORBIDDEN_CROSS_TENANT_ACCESS');
};

export default {
  TEST_PERSONAS,
  TEST_TENANTS,
  makeAuthHeaders,
  assertSuccessEnvelope,
  assertPaginatedEnvelope,
  assertErrorEnvelope,
  assertRequiresAuth,
  assertRequiresTenantHeader,
  assertBlocksCrossTenantAccess
};
