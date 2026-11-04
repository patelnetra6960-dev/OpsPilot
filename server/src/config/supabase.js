import { createClient } from '@supabase/supabase-js';
import env from './env.js';
import logger from '../utils/logger.js';

// Verify that service role key is NEVER used on frontend
if (typeof window !== 'undefined') {
  throw new Error('FATAL SECURITY VIOLATION: Backend Supabase module loaded in browser context!');
}

let supabaseAdmin = null;

if (!env.isMockMode && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.info('Supabase Admin Client initialized with Service Role Key');
  } catch (err) {
    logger.error('Failed to initialize Supabase Admin client', err);
  }
} else {
  logger.info('OpsPilot running in Mock/Development Mode for Supabase backend');
}

/**
 * Returns a user-scoped Supabase client that forwards the user's JWT.
 * This guarantees PostgreSQL RLS policies are applied to this specific user.
 */
export const getUserSupabaseClient = (userToken) => {
  if (env.isMockMode || !env.SUPABASE_URL) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * In-memory Mock Data Store for development and testing when live Supabase is not configured
 */
export const mockDatabase = {
  organizations: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Logistics Global',
      slug: 'acme-logistics',
      subscription_tier: 'enterprise',
      is_active: true,
      settings: { timezone: 'America/New_York', currency: 'USD' },
      created_at: new Date('2026-01-01').toISOString(),
      updated_at: new Date('2026-01-01').toISOString()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Apex Field Services',
      slug: 'apex-field-services',
      subscription_tier: 'growth',
      is_active: true,
      settings: { timezone: 'Europe/London', currency: 'GBP' },
      created_at: new Date('2026-02-01').toISOString(),
      updated_at: new Date('2026-02-01').toISOString()
    }
  ],
  users: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'alex.director@acme.com',
      full_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      is_superadmin: false
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      email: 'sarah.ops@acme.com',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      is_superadmin: false
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      email: 'marcus.lead@apex.com',
      full_name: 'Marcus Vance',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      is_superadmin: false
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      email: 'david.m@acme.com',
      full_name: 'David Miller',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      is_superadmin: false
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      email: 'rachel.green@metrohealth.com',
      full_name: 'Rachel Green',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      is_superadmin: false
    },
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      email: 'victoria.root@opspilot.io',
      full_name: 'Victoria Root',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      is_superadmin: true
    }
  ],
  memberships: [
    {
      id: 'm1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      role: 'owner',
      status: 'active'
    },
    {
      id: 'm2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      role: 'manager',
      status: 'active'
    },
    {
      id: 'm3',
      organization_id: '22222222-2222-2222-2222-222222222222',
      user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      role: 'owner',
      status: 'active'
    },
    {
      id: 'm4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      role: 'employee',
      status: 'active'
    },
    {
      id: 'm5',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      role: 'customer',
      status: 'active'
    }
  ],
  departments: [
    {
      id: 'dept-acme-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Fleet Operations',
      code: 'FLEET',
      description: 'Fleet dispatch and logistics',
      manager_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    },
    {
      id: 'dept-acme-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Warehouse Logistics',
      code: 'WAREHOUSE',
      description: 'Warehouse inventory and handling',
      manager_id: null
    },
    {
      id: 'dept-acme-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Field Operations',
      code: 'FIELD_OPS',
      description: 'Mobile on-site technician deployment',
      manager_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    }
  ],
  invitations: [
    {
      id: 'inv-acme-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      email: 'candidate.engineer@test.com',
      role: 'employee',
      token: 'mock-inv-token-acme-1',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  workforce: [
    {
      id: 'w1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      department_id: 'dept-acme-1',
      manager_id: null,
      employee_code: 'EMP-ACME-001',
      first_name: 'David',
      last_name: 'Miller',
      email: 'david.m@acme.com',
      department: 'Fleet Operations',
      designation: 'Lead Fleet Dispatcher',
      employment_type: 'full_time',
      status: 'active',
      hourly_rate: 42.5
    },
    {
      id: 'w2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      department_id: 'dept-acme-2',
      manager_id: 'w1',
      employee_code: 'EMP-ACME-002',
      first_name: 'Elena',
      last_name: 'Rostova',
      email: 'elena.r@acme.com',
      department: 'Warehouse Logistics',
      designation: 'Inventory Supervisor',
      employment_type: 'full_time',
      status: 'active',
      hourly_rate: 38.0
    },
    {
      id: 'w3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      department_id: 'dept-acme-3',
      manager_id: 'w1',
      employee_code: 'EMP-ACME-003',
      first_name: 'Liam',
      last_name: 'Patel',
      email: 'liam.p@acme.com',
      department: 'Field Operations',
      designation: 'Mobile Technician',
      employment_type: 'contract',
      status: 'active',
      hourly_rate: 45.0
    },
    {
      id: 'w4',
      organization_id: '22222222-2222-2222-2222-222222222222',
      employee_code: 'EMP-APEX-001',
      first_name: 'Oliver',
      last_name: 'Smith',
      email: 'oliver.s@apex.com',
      department: 'HVAC Operations',
      designation: 'Senior Technician',
      employment_type: 'full_time',
      status: 'active',
      hourly_rate: 50.0
    },
    {
      id: 'w5',
      organization_id: '22222222-2222-2222-2222-222222222222',
      employee_code: 'EMP-APEX-002',
      first_name: 'Sophia',
      last_name: 'Taylor',
      email: 'sophia.t@apex.com',
      department: 'Customer Support',
      designation: 'Dispatcher Coordinator',
      employment_type: 'full_time',
      status: 'active',
      hourly_rate: 32.0
    }
  ],
  customers: [
    {
      id: 'cust-acme-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Metro Health System',
      email: 'rachel.green@metrohealth.com',
      user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      sla_tier: 'critical',
      status: 'active'
    },
    {
      id: 'cust-apex-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      name: 'Pinnacle Energy Corp',
      email: 'contact@pinnacle.com',
      user_id: null,
      sla_tier: 'premium',
      status: 'active'
    }
  ],
  serviceRequests: [
    {
      id: 'sr-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      request_code: 'SR-2026-001',
      title: 'MRI Cooling Loop Flow Failure',
      status: 'assigned',
      urgency: 'critical'
    },
    {
      id: 'sr-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      request_code: 'SR-APEX-001',
      title: 'Substation Transformer Overheating',
      status: 'new',
      urgency: 'high'
    },
    {
      id: 'sr-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-2', // Different customer in Acme
      request_code: 'SR-2026-003',
      title: 'Ventilation Fan Sensor Offline',
      status: 'pending',
      urgency: 'medium'
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      invoice_number: 'INV-2026-001',
      total: 3200.0,
      status: 'pending'
    },
    {
      id: 'inv-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      invoice_number: 'INV-APEX-001',
      total: 7500.0,
      status: 'paid'
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      workforce_member_id: 'w1', // David Miller
      claim_code: 'EXP-001',
      amount: 145.5,
      status: 'pending'
    }
  ],
  auditLogs: []
};

export { supabaseAdmin };
export default supabaseAdmin;
