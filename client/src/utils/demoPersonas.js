/**
 * OpsPilot - Standardized Demo Personas
 * Covers all 5 roles defined in PRD & System Architecture:
 * 1. Super Admin (Platform Operator)
 * 2. Organization Admin (Tenant Owner / Admin)
 * 3. Manager (Operations & Dispatch Manager)
 * 4. Employee (Field Technician & Logistics)
 * 5. Customer (Client Portal)
 */

export const DEMO_PERSONAS = [
  {
    roleId: 'owner',
    roleLabel: 'Org Admin (Owner)',
    label: 'Alex Rivera — Acme Logistics (Owner)',
    user: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'alex.director@acme.com',
      full_name: 'Alex Rivera',
      role: 'owner',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      title: 'Managing Director & Tenant Owner'
    },
    token: 'mock-token-alex',
    tenant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      subscription_tier: 'enterprise',
      role: 'owner'
    },
    defaultRoute: '/'
  },
  {
    roleId: 'superadmin',
    roleLabel: 'Super Admin',
    label: 'Elena Rostova — OpsPilot Platform (Super Admin)',
    user: {
      id: 'ssssssss-ssss-ssss-ssss-ssssssssssss',
      email: 'elena.admin@opspilot.internal',
      full_name: 'Elena Rostova',
      role: 'superadmin',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      title: 'Global Platform Operations Lead'
    },
    token: 'mock-token-superadmin',
    tenant: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'OpsPilot SaaS Platform',
      slug: 'opspilot-platform',
      subscription_tier: 'platform',
      role: 'superadmin'
    },
    defaultRoute: '/super-admin'
  },
  {
    roleId: 'manager',
    roleLabel: 'Manager',
    label: 'Sarah Chen — Acme Logistics (Ops Manager)',
    user: {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      email: 'sarah.ops@acme.com',
      full_name: 'Sarah Chen',
      role: 'manager',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      title: 'Regional Field Operations Manager'
    },
    token: 'mock-token-sarah',
    tenant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      subscription_tier: 'enterprise',
      role: 'manager'
    },
    defaultRoute: '/manager'
  },
  {
    roleId: 'employee',
    roleLabel: 'Employee',
    label: 'David Kim — Acme Logistics (Field Tech)',
    user: {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      email: 'david.kim@acme.com',
      full_name: 'David Kim',
      role: 'employee',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      title: 'Senior Field Technician'
    },
    token: 'mock-token-david',
    tenant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      subscription_tier: 'enterprise',
      role: 'employee'
    },
    defaultRoute: '/portal'
  },
  {
    roleId: 'customer',
    roleLabel: 'Customer',
    label: 'Olivia Parker — Metro Retail (Client Partner)',
    user: {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      email: 'olivia@metrologistics.com',
      full_name: 'Olivia Parker',
      role: 'customer',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      title: 'Supply Chain Director (Client)'
    },
    token: 'mock-token-olivia',
    tenant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      subscription_tier: 'enterprise',
      role: 'customer'
    },
    defaultRoute: '/customer'
  },
  {
    roleId: 'owner',
    roleLabel: 'Tenant Owner (Apex)',
    label: 'Marcus Vance — Apex Services (Owner)',
    user: {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      email: 'marcus.lead@apex.com',
      full_name: 'Marcus Vance',
      role: 'owner',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      title: 'President & Founder'
    },
    token: 'mock-token-marcus',
    tenant: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Apex Field Services',
      slug: 'apex-field-services',
      subscription_tier: 'growth',
      role: 'owner'
    },
    defaultRoute: '/'
  }
];

export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case 'superadmin':
      return '/super-admin';
    case 'manager':
      return '/manager';
    case 'employee':
      return '/portal';
    case 'customer':
      return '/customer';
    case 'owner':
    case 'admin':
    default:
      return '/';
  }
};
