import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PERSONAS, getDefaultRouteForRole } from '../../client/src/utils/demoPersonas.js';

describe('Role Navigation & Demo Persona Test Suite', () => {
  it('1. Covers all 5 roles defined in PRD and Architecture', () => {
    const roles = DEMO_PERSONAS.map((p) => p.roleId);
    assert.ok(roles.includes('superadmin'), 'Super Admin persona present');
    assert.ok(roles.includes('owner'), 'Organization Admin / Owner persona present');
    assert.ok(roles.includes('manager'), 'Manager persona present');
    assert.ok(roles.includes('employee'), 'Employee persona present');
    assert.ok(roles.includes('customer'), 'Customer persona present');
  });

  it('2. Maps every role to its designated landing route', () => {
    assert.equal(getDefaultRouteForRole('superadmin'), '/super-admin');
    assert.equal(getDefaultRouteForRole('manager'), '/manager');
    assert.equal(getDefaultRouteForRole('employee'), '/portal');
    assert.equal(getDefaultRouteForRole('customer'), '/customer');
    assert.equal(getDefaultRouteForRole('owner'), '/');
    assert.equal(getDefaultRouteForRole('admin'), '/');
  });

  it('3. Every persona has valid mock tenant context and tokens', () => {
    for (const persona of DEMO_PERSONAS) {
      assert.ok(persona.token, `Token exists for ${persona.roleLabel}`);
      assert.ok(persona.user.id, `User ID exists for ${persona.roleLabel}`);
      assert.ok(persona.user.email.includes('@'), `Valid email for ${persona.roleLabel}`);
      assert.ok(persona.tenant.id, `Tenant ID exists for ${persona.roleLabel}`);
      assert.ok(persona.tenant.name, `Tenant Name exists for ${persona.roleLabel}`);
    }
  });
});
