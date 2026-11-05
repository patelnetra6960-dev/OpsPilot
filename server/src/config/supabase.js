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
      company_name: 'Metro Health System Inc.',
      contact_name: 'Rachel Green',
      email: 'rachel.green@metrohealth.com',
      phone: '+1 (555) 234-8901',
      user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      sla_tier: 'critical',
      status: 'active',
      customer_code: 'CUST-ACME-001',
      lead_status: 'active',
      follow_up_date: '2026-11-20',
      follow_up_notes: 'Quarterly review of telemetry cooling loops and equipment warranties',
      address: {
        street: '742 Evergreen Terrace, Suite 400',
        city: 'Metropolis',
        state: 'NY',
        postal_code: '10001',
        country: 'USA'
      },
      created_at: new Date('2026-02-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-15T08:00:00Z').toISOString()
    },
    {
      id: 'cust-acme-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Pacific Freight Express',
      company_name: 'Pacific Freight Express LLC',
      contact_name: 'Marcus Vance',
      email: 'marcus.v@pacificfreight.com',
      phone: '+1 (555) 345-1209',
      user_id: null,
      sla_tier: 'premium',
      status: 'active',
      customer_code: 'CUST-ACME-002',
      lead_status: 'active',
      follow_up_date: '2026-11-18',
      follow_up_notes: 'Follow up on DC fast charging transformer deployment',
      address: {
        street: '108 Harbor Way, Pier 9',
        city: 'Seattle',
        state: 'WA',
        postal_code: '98101',
        country: 'USA'
      },
      created_at: new Date('2026-03-10T10:00:00Z').toISOString(),
      updated_at: new Date('2026-03-10T10:00:00Z').toISOString()
    },
    {
      id: 'cust-acme-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Metro Retail Distribution Co.',
      company_name: 'Metro Retail Distribution Co.',
      contact_name: 'Olivia Parker',
      email: 'olivia.p@metrologistics.com',
      phone: '+1 (555) 456-7890',
      user_id: null,
      sla_tier: 'standard',
      status: 'lead',
      customer_code: 'CUST-ACME-003',
      lead_status: 'lead',
      follow_up_date: '2026-11-15',
      follow_up_notes: 'Initial demo of automated conveyor belt sensor telemetry',
      address: {
        street: '450 Industrial Parkway',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'USA'
      },
      created_at: new Date('2026-04-01T09:00:00Z').toISOString(),
      updated_at: new Date('2026-04-01T09:00:00Z').toISOString()
    },
    {
      id: 'cust-apex-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      name: 'Pinnacle Energy Corp',
      company_name: 'Pinnacle Energy Corporation',
      contact_name: 'Elena Rostova',
      email: 'contact@pinnacle.com',
      phone: '+44 20 7946 0912',
      user_id: null,
      sla_tier: 'premium',
      status: 'active',
      customer_code: 'CUST-APEX-001',
      lead_status: 'active',
      follow_up_date: null,
      follow_up_notes: null,
      address: {
        street: '22 Bishopsgate',
        city: 'London',
        state: 'Greater London',
        postal_code: 'EC2N 4BQ',
        country: 'UK'
      },
      created_at: new Date('2026-02-20T11:00:00Z').toISOString(),
      updated_at: new Date('2026-02-20T11:00:00Z').toISOString()
    }
  ],
  customer_notes: [
    {
      id: 'cn-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      author_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      author_name: 'Alex Rivera',
      note: 'Client requested priority 2-hour SLA response for surgical ward HVAC systems and backup generator loops.',
      created_at: new Date('2026-10-15T10:30:00Z').toISOString()
    },
    {
      id: 'cn-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      author_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      author_name: 'Sarah Chen',
      note: 'Verified MRI chilling telemetry connectivity. Sensor calibrated on 2026-10-28.',
      created_at: new Date('2026-10-28T14:15:00Z').toISOString()
    }
  ],
  customer_feedback: [
    {
      id: 'fb-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      service_request_id: 'sr-1',
      rating: 5,
      comments:
        'Technician arrived within 45 minutes and fixed the flow sensor promptly. Excellent work!',
      created_at: new Date('2026-11-01T14:20:00Z').toISOString()
    }
  ],
  serviceRequests: [
    {
      id: 'sr-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      customer_name: 'Metro Health System',
      request_code: 'SR-2026-001',
      title: 'MRI Cooling Loop Flow Failure',
      description: 'Chilled water flow in MRI suite Bay 3 dropped below safe operating threshold.',
      location: 'Main Medical Tower - Radiology Bay 3',
      service_type: 'repair',
      status: 'approved',
      urgency: 'critical',
      step: 3,
      eta: 'Today at 02:30 PM',
      assigned_to: 'w1',
      assigned_technician: 'David Miller',
      converted_work_order_id: 'wo-1',
      manager_notes: 'Priority medical facility incident. Dispatched David Miller with OEM pump.',
      rejection_reason: null,
      reviewed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      reviewed_at: new Date('2026-11-04T08:40:00Z').toISOString(),
      approved_at: new Date('2026-11-04T08:45:00Z').toISOString(),
      attachments: [
        {
          id: 'att-1',
          name: 'radiology_loop_pressure_log.pdf',
          url: 'https://storage.opspilot.internal/vault/radiology_loop_pressure_log.pdf',
          file_size: 245760,
          type: 'application/pdf',
          uploaded_at: new Date('2026-11-04T08:35:00Z').toISOString()
        }
      ],
      status_history: [
        {
          status: 'new',
          old_status: null,
          changed_by: 'cust-acme-1',
          changed_by_name: 'Rachel Green',
          timestamp: new Date('2026-11-04T08:30:00Z').toISOString(),
          notes: 'Customer submitted ticket via portal'
        },
        {
          status: 'in_review',
          old_status: 'new',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: new Date('2026-11-04T08:40:00Z').toISOString(),
          notes: 'Triage and review commenced by operations manager'
        },
        {
          status: 'approved',
          old_status: 'in_review',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: new Date('2026-11-04T08:45:00Z').toISOString(),
          notes: 'Approved for emergency dispatch'
        }
      ],
      created_at: new Date('2026-11-04T08:30:00Z').toISOString(),
      updated_at: new Date('2026-11-04T09:00:00Z').toISOString()
    },
    {
      id: 'sr-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      customer_name: 'Pinnacle Energy Corp',
      request_code: 'SR-APEX-001',
      title: 'Substation Transformer Overheating',
      description: 'Transformer 4 thermal sensor reporting 88C under normal load.',
      location: 'Substation Yard East',
      service_type: 'safety',
      status: 'approved',
      urgency: 'high',
      step: 2,
      eta: 'Awaiting Dispatch',
      assigned_to: 'w2',
      assigned_technician: 'Elena Rostova',
      converted_work_order_id: 'wo-3',
      manager_notes: 'Thermal test approved for Elena Rostova',
      rejection_reason: null,
      reviewed_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      reviewed_at: new Date('2026-11-03T11:15:00Z').toISOString(),
      approved_at: new Date('2026-11-03T11:20:00Z').toISOString(),
      attachments: [],
      status_history: [
        {
          status: 'new',
          old_status: null,
          changed_by: 'cust-apex-1',
          changed_by_name: 'Client Contact',
          timestamp: new Date('2026-11-03T11:00:00Z').toISOString(),
          notes: 'Intake submitted'
        },
        {
          status: 'approved',
          old_status: 'new',
          changed_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          changed_by_name: 'Marcus Vance',
          timestamp: new Date('2026-11-03T11:20:00Z').toISOString(),
          notes: 'High voltage safety scope approved'
        }
      ],
      created_at: new Date('2026-11-03T11:00:00Z').toISOString(),
      updated_at: new Date('2026-11-03T11:20:00Z').toISOString()
    },
    {
      id: 'sr-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-2',
      customer_name: 'Pacific Freight Express',
      request_code: 'SR-2026-003',
      title: 'Ventilation Fan Sensor Offline',
      description: 'Fleet garage exhaust sensor communication lost.',
      location: 'Fleet Depot Bay 7',
      service_type: 'maintenance',
      status: 'in_review',
      urgency: 'normal',
      step: 2,
      eta: 'Tomorrow at 10:00 AM',
      assigned_to: 'w3',
      assigned_technician: 'Liam Patel',
      converted_work_order_id: null,
      manager_notes: 'Awaiting technician diagnostic report on sensor wiring.',
      rejection_reason: null,
      reviewed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      reviewed_at: new Date('2026-11-04T12:10:00Z').toISOString(),
      approved_at: null,
      attachments: [],
      status_history: [
        {
          status: 'new',
          old_status: null,
          changed_by: 'cust-acme-2',
          changed_by_name: 'Depot Manager',
          timestamp: new Date('2026-11-04T12:00:00Z').toISOString(),
          notes: 'Reported via client desk'
        },
        {
          status: 'in_review',
          old_status: 'new',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: new Date('2026-11-04T12:10:00Z').toISOString(),
          notes: 'Assigned to Liam for initial scope inspection'
        }
      ],
      created_at: new Date('2026-11-04T12:00:00Z').toISOString(),
      updated_at: new Date('2026-11-04T12:10:00Z').toISOString()
    },
    {
      id: 'sr-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      customer_name: 'Metro Health System',
      request_code: 'SR-2026-004',
      title: 'Elevator Hydraulic Seal Replacement',
      description: 'Hydraulic pressure drop detected during monthly facility elevator cycle check.',
      location: 'North Wing Service Elevator 2',
      service_type: 'maintenance',
      status: 'approved',
      urgency: 'high',
      step: 2,
      eta: 'Approved for Work Order Generation',
      assigned_to: null,
      assigned_technician: null,
      converted_work_order_id: null,
      manager_notes: 'Approved for OEM seal replacement kit. Ready for work order dispatch.',
      rejection_reason: null,
      reviewed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      reviewed_at: new Date('2026-11-04T15:00:00Z').toISOString(),
      approved_at: new Date('2026-11-04T15:10:00Z').toISOString(),
      attachments: [],
      status_history: [
        {
          status: 'new',
          old_status: null,
          changed_by: 'cust-acme-1',
          changed_by_name: 'Rachel Green',
          timestamp: new Date('2026-11-04T14:30:00Z').toISOString(),
          notes: 'Routine service intake'
        },
        {
          status: 'approved',
          old_status: 'new',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: new Date('2026-11-04T15:10:00Z').toISOString(),
          notes: 'Approved'
        }
      ],
      created_at: new Date('2026-11-04T14:30:00Z').toISOString(),
      updated_at: new Date('2026-11-04T15:10:00Z').toISOString()
    }
  ],
  work_orders: [
    {
      id: 'wo-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      work_order_code: 'WO-2026-001',
      title: 'MRI Chilled Water Loop Pump Replacement',
      description: 'Replace auxiliary secondary coolant circulation pump on Bay 3 chiller unit.',
      customer_id: 'cust-acme-1',
      customer_name: 'Metro Health System',
      service_request_id: 'sr-1',
      assigned_to: 'w1', // David Miller
      assigned_technician: 'David Miller',
      assigned_at: '2026-11-04T09:00:00Z',
      site: 'Main Medical Tower - Radiology Bay 3',
      priority: 'critical',
      status: 'in_progress',
      scheduled_start: '2026-11-04T13:00:00Z',
      scheduled_end: '2026-11-04T17:00:00Z',
      scheduled_window: 'Today 13:00 - 17:00',
      cost_estimate: 1850.0,
      actual_cost: 0,
      labor_hours: 3.5,
      progress: 60,
      checklists: [
        {
          id: 'ck-1',
          item_text: 'Lockout-Tagout 480V chiller distribution feed',
          is_completed: true,
          completed_at: '2026-11-04T13:15:00Z',
          completed_by: 'David Miller'
        },
        {
          id: 'ck-2',
          item_text: 'Drain auxiliary loop and capture glycol mixture',
          is_completed: true,
          completed_at: '2026-11-04T13:45:00Z',
          completed_by: 'David Miller'
        },
        {
          id: 'ck-3',
          item_text: 'Install OEM pump replacement and torque flange bolts',
          is_completed: true,
          completed_at: '2026-11-04T14:30:00Z',
          completed_by: 'David Miller'
        },
        {
          id: 'ck-4',
          item_text: 'Pressure test closed loop to 45 PSI for 30 minutes',
          is_completed: false,
          completed_at: null,
          completed_by: null
        },
        {
          id: 'ck-5',
          item_text: 'Verify flow sensor telemetry in BMS control room',
          is_completed: false,
          completed_at: null,
          completed_by: null
        }
      ],
      notes: [
        {
          id: 'wn-1',
          author_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          author_name: 'Sarah Connor',
          note: 'Priority expedited due to patient MRI scan schedule tomorrow morning.',
          created_at: '2026-11-04T09:15:00Z',
          is_internal: true
        },
        {
          id: 'wn-2',
          author_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          author_name: 'David Miller',
          note: 'Arrived on site. Flange gasket arrived with part. Commencing lockout-tagout.',
          created_at: '2026-11-04T13:10:00Z',
          is_internal: false
        }
      ],
      before_photos: [
        {
          id: 'ph-1',
          url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          caption: 'Initial pump leak and corrosion before teardown',
          uploaded_at: '2026-11-04T13:20:00Z'
        }
      ],
      after_photos: [],
      completion_details: null,
      customer_confirmation: null,
      status_history: [
        {
          status: 'draft',
          old_status: null,
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: '2026-11-04T08:45:00Z',
          reason: 'Generated from approved SR-2026-001'
        },
        {
          status: 'scheduled',
          old_status: 'draft',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: '2026-11-04T09:00:00Z',
          reason: 'Assigned to David Miller for 13:00 dispatch'
        },
        {
          status: 'dispatched',
          old_status: 'scheduled',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: '2026-11-04T12:30:00Z',
          reason: 'Technician en route to facility'
        },
        {
          status: 'in_progress',
          old_status: 'dispatched',
          changed_by: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          changed_by_name: 'David Miller',
          timestamp: '2026-11-04T13:05:00Z',
          reason: 'Work commenced on site'
        }
      ],
      created_at: new Date('2026-11-04T08:45:00Z').toISOString(),
      updated_at: new Date('2026-11-04T14:30:00Z').toISOString()
    },
    {
      id: 'wo-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      work_order_code: 'WO-2026-002',
      title: 'Emergency Exhaust Damper Actuator Overhaul',
      description: 'Replace burned out electric servo actuator on Fleet Garage emergency damper.',
      customer_id: 'cust-acme-2',
      customer_name: 'Pacific Freight Express',
      service_request_id: null,
      assigned_to: 'w3', // Liam Patel
      assigned_technician: 'Liam Patel',
      assigned_at: '2026-11-03T10:00:00Z',
      site: 'Fleet Depot Bay 7',
      priority: 'high',
      status: 'completed',
      scheduled_start: '2026-11-03T11:00:00Z',
      scheduled_end: '2026-11-03T15:00:00Z',
      scheduled_window: 'Yesterday 11:00 - 15:00',
      cost_estimate: 950.0,
      actual_cost: 920.0,
      labor_hours: 4.0,
      progress: 100,
      checklists: [
        {
          id: 'ck-201',
          item_text: 'De-energize damper circuit breaker',
          is_completed: true,
          completed_at: '2026-11-03T11:15:00Z',
          completed_by: 'Liam Patel'
        },
        {
          id: 'ck-202',
          item_text: 'Unbolt seized actuator arm and inspect linkage',
          is_completed: true,
          completed_at: '2026-11-03T12:00:00Z',
          completed_by: 'Liam Patel'
        },
        {
          id: 'ck-203',
          item_text: 'Install Belimo 24V servo actuator',
          is_completed: true,
          completed_at: '2026-11-03T13:30:00Z',
          completed_by: 'Liam Patel'
        },
        {
          id: 'ck-204',
          item_text: 'Calibrate full-stroke open/close limits',
          is_completed: true,
          completed_at: '2026-11-03T14:15:00Z',
          completed_by: 'Liam Patel'
        }
      ],
      notes: [
        {
          id: 'wn-201',
          author_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          author_name: 'Liam Patel',
          note: 'Job completed. Damper operating smoothly with zero resistance.',
          created_at: '2026-11-03T14:30:00Z',
          is_internal: false
        }
      ],
      before_photos: [
        {
          id: 'ph-201',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
          caption: 'Burned out actuator motor',
          uploaded_at: '2026-11-03T11:30:00Z'
        }
      ],
      after_photos: [
        {
          id: 'ph-202',
          url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
          caption: 'New Belimo actuator installed and operational',
          uploaded_at: '2026-11-03T14:20:00Z'
        }
      ],
      completion_details: {
        completion_notes:
          'Replaced failed actuator motor with Belimo 24V unit. Limit switches calibrated and certified.',
        completed_at: '2026-11-03T14:35:00Z',
        completed_by: 'Liam Patel',
        actual_cost: 920.0,
        labor_hours: 4.0,
        parts_used: [
          {
            item_id: 'part-act-01',
            name: 'Belimo Servo Actuator 24V',
            quantity: 1,
            cost: 480.0
          }
        ]
      },
      customer_confirmation: {
        customer_signature_url: 'data:image/svg+xml;utf8,<svg>signature</svg>',
        confirmed_at: '2026-11-03T15:00:00Z',
        rating: 5,
        feedback: 'Fast response and fixed before our afternoon shift change.',
        confirmed_by: 'Pacific Freight Supervisor'
      },
      status_history: [
        {
          status: 'draft',
          old_status: null,
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: '2026-11-03T09:30:00Z',
          reason: 'Direct creation by Dispatch'
        },
        {
          status: 'dispatched',
          old_status: 'draft',
          changed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          changed_by_name: 'Sarah Connor',
          timestamp: '2026-11-03T10:00:00Z',
          reason: 'Assigned to Liam Patel'
        },
        {
          status: 'in_progress',
          old_status: 'dispatched',
          changed_by: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          changed_by_name: 'Liam Patel',
          timestamp: '2026-11-03T11:00:00Z',
          reason: 'On site'
        },
        {
          status: 'completed',
          old_status: 'in_progress',
          changed_by: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          changed_by_name: 'Liam Patel',
          timestamp: '2026-11-03T14:35:00Z',
          reason: 'All checklist items verified'
        }
      ],
      created_at: new Date('2026-11-03T09:30:00Z').toISOString(),
      updated_at: new Date('2026-11-03T15:00:00Z').toISOString()
    },
    {
      id: 'wo-3',
      organization_id: '22222222-2222-2222-2222-222222222222', // Apex Tenant
      work_order_code: 'WO-APEX-001',
      title: 'High-Voltage Transformer Thermal Scan',
      description: 'Thermal imaging and contact resistance test on substation transformer 4.',
      customer_id: 'cust-apex-1',
      customer_name: 'Pinnacle Energy Corp',
      service_request_id: 'sr-2',
      assigned_to: 'w2',
      assigned_technician: 'Elena Rostova',
      assigned_at: '2026-11-03T12:00:00Z',
      site: 'Substation Yard East',
      priority: 'high',
      status: 'scheduled',
      scheduled_start: '2026-11-07T08:00:00Z',
      scheduled_end: '2026-11-07T12:00:00Z',
      scheduled_window: 'Tomorrow 08:00 - 12:00',
      cost_estimate: 2100.0,
      actual_cost: 0,
      labor_hours: 0,
      progress: 0,
      checklists: [
        {
          id: 'ck-301',
          item_text: 'PPE and arc flash boundary setup',
          is_completed: false,
          completed_at: null,
          completed_by: null
        },
        {
          id: 'ck-302',
          item_text: 'Calibrated FLIR thermal imaging sweep',
          is_completed: false,
          completed_at: null,
          completed_by: null
        }
      ],
      notes: [],
      before_photos: [],
      after_photos: [],
      completion_details: null,
      customer_confirmation: null,
      status_history: [
        {
          status: 'draft',
          old_status: null,
          changed_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          changed_by_name: 'Marcus Vance',
          timestamp: '2026-11-03T11:30:00Z',
          reason: 'Created from SR-APEX-001'
        },
        {
          status: 'scheduled',
          old_status: 'draft',
          changed_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          changed_by_name: 'Marcus Vance',
          timestamp: '2026-11-03T12:00:00Z',
          reason: 'Scheduled with Elena'
        }
      ],
      created_at: new Date('2026-11-03T11:30:00Z').toISOString(),
      updated_at: new Date('2026-11-03T12:00:00Z').toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', // David
      title: 'New Work Order Assigned',
      message: 'You have been dispatched to WO-2026-001 (MRI Chilled Water Loop).',
      type: 'dispatch',
      action_url: '/workorders',
      is_read: false,
      read_at: null,
      created_at: new Date('2026-11-04T09:00:00Z').toISOString()
    },
    {
      id: 'notif-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', // Rachel (Customer)
      title: 'Service Request Approved',
      message: 'Your service request SR-2026-001 has been approved and dispatched to operations.',
      type: 'success',
      action_url: '/customer/services',
      is_read: true,
      read_at: new Date('2026-11-04T09:05:00Z').toISOString(),
      created_at: new Date('2026-11-04T08:45:00Z').toISOString()
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      customer_name: 'Metro Retail Distribution Co.',
      invoice_number: 'INV-2026-001',
      work_order_id: 'wo-1',
      issue_date: '2026-11-01',
      due_date: '2026-11-30',
      subtotal: 2950.0,
      discount_amount: 0.0,
      tax_rate: 8.47,
      tax: 250.0,
      total: 3200.0,
      paid_amount: 0.0,
      balance_due: 3200.0,
      status: 'pending',
      desc: 'Monthly Scheduled Chiller & HVAC Facility Maintenance',
      notes: 'Net 30 payment terms. Please reference INV-2026-001 on transfer.',
      items: [
        {
          id: 'ii-1',
          invoice_id: 'inv-1',
          organization_id: '11111111-1111-1111-1111-111111111111',
          inventory_item_id: null,
          description: 'Preventative Chiller Maintenance & Calibration',
          quantity: 1,
          unit_price: 2450.0,
          total_price: 2450.0
        },
        {
          id: 'ii-2',
          invoice_id: 'inv-1',
          organization_id: '11111111-1111-1111-1111-111111111111',
          inventory_item_id: 'inv-1',
          description: 'High-Pressure Refrigerant Seal Replacement',
          quantity: 2,
          unit_price: 250.0,
          total_price: 500.0
        }
      ],
      created_at: new Date('2026-11-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-11-01T08:00:00Z').toISOString()
    },
    {
      id: 'inv-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      customer_name: 'Apex Industrial Parts Ltd',
      invoice_number: 'INV-APEX-001',
      work_order_id: null,
      issue_date: '2026-10-15',
      due_date: '2026-11-15',
      subtotal: 6800.0,
      discount_amount: 0.0,
      tax_rate: 10.29,
      tax: 700.0,
      total: 7500.0,
      paid_amount: 7500.0,
      balance_due: 0.0,
      status: 'paid',
      paid_at: new Date('2026-10-25T14:30:00Z').toISOString(),
      desc: 'High-Voltage Switchgear Preventive Maintenance',
      notes: 'Paid in full via wire transfer.',
      items: [
        {
          id: 'ii-3',
          invoice_id: 'inv-2',
          organization_id: '22222222-2222-2222-2222-222222222222',
          inventory_item_id: null,
          description: 'Switchgear Busbar Inspection & Thermal Scan',
          quantity: 1,
          unit_price: 6800.0,
          total_price: 6800.0
        }
      ],
      created_at: new Date('2026-10-15T09:00:00Z').toISOString(),
      updated_at: new Date('2026-10-25T14:30:00Z').toISOString()
    },
    {
      id: 'inv-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      customer_name: 'Metro Retail Distribution Co.',
      invoice_number: 'INV-2026-092',
      work_order_id: null,
      issue_date: '2026-10-01',
      due_date: '2026-10-31',
      subtotal: 1650.0,
      discount_amount: 0.0,
      tax_rate: 9.09,
      tax: 150.0,
      total: 1800.0,
      paid_amount: 1800.0,
      balance_due: 0.0,
      status: 'paid',
      paid_at: new Date('2026-10-18T10:15:00Z').toISOString(),
      desc: 'Quarterly Sensor Calibration & Safety Certifications',
      notes: 'Settled via ACH on 10/18/2026.',
      items: [
        {
          id: 'ii-4',
          invoice_id: 'inv-3',
          organization_id: '11111111-1111-1111-1111-111111111111',
          inventory_item_id: 'inv-2',
          description: 'Precision Temperature Sensor Recalibration (x6)',
          quantity: 6,
          unit_price: 200.0,
          total_price: 1200.0
        },
        {
          id: 'ii-5',
          invoice_id: 'inv-3',
          organization_id: '11111111-1111-1111-1111-111111111111',
          inventory_item_id: null,
          description: 'OSHA / Facility Safety Certification Documentation',
          quantity: 1,
          unit_price: 450.0,
          total_price: 450.0
        }
      ],
      created_at: new Date('2026-10-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-18T10:15:00Z').toISOString()
    },
    {
      id: 'inv-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-2',
      customer_name: 'Metro Health Systems',
      invoice_number: 'INV-2026-044',
      work_order_id: null,
      issue_date: '2026-10-20',
      due_date: '2026-11-20',
      subtotal: 4100.0,
      discount_amount: 0.0,
      tax_rate: 9.76,
      tax: 400.0,
      total: 4500.0,
      paid_amount: 1500.0,
      balance_due: 3000.0,
      status: 'pending',
      desc: 'EV Fast Charger Installation & High-Voltage Transformers',
      notes: 'Initial deposit check received. Remaining balance due on final inspection.',
      items: [
        {
          id: 'ii-6',
          invoice_id: 'inv-4',
          organization_id: '11111111-1111-1111-1111-111111111111',
          inventory_item_id: null,
          description: 'Transformer Commissioning & Power Balancing',
          quantity: 1,
          unit_price: 4100.0,
          total_price: 4100.0
        }
      ],
      created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-25T11:00:00Z').toISOString()
    }
  ],
  invoice_items: [
    {
      id: 'ii-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-1',
      inventory_item_id: null,
      description: 'Preventative Chiller Maintenance & Calibration',
      quantity: 1,
      unit_price: 2450.0,
      total_price: 2450.0,
      created_at: new Date('2026-11-01T08:00:00Z').toISOString()
    },
    {
      id: 'ii-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-1',
      inventory_item_id: 'inv-1',
      description: 'High-Pressure Refrigerant Seal Replacement',
      quantity: 2,
      unit_price: 250.0,
      total_price: 500.0,
      created_at: new Date('2026-11-01T08:00:00Z').toISOString()
    },
    {
      id: 'ii-3',
      organization_id: '22222222-2222-2222-2222-222222222222',
      invoice_id: 'inv-2',
      inventory_item_id: null,
      description: 'Switchgear Busbar Inspection & Thermal Scan',
      quantity: 1,
      unit_price: 6800.0,
      total_price: 6800.0,
      created_at: new Date('2026-10-15T09:00:00Z').toISOString()
    },
    {
      id: 'ii-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-3',
      inventory_item_id: 'inv-2',
      description: 'Precision Temperature Sensor Recalibration (x6)',
      quantity: 6,
      unit_price: 200.0,
      total_price: 1200.0,
      created_at: new Date('2026-10-01T08:00:00Z').toISOString()
    },
    {
      id: 'ii-5',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-3',
      inventory_item_id: null,
      description: 'OSHA / Facility Safety Certification Documentation',
      quantity: 1,
      unit_price: 450.0,
      total_price: 450.0,
      created_at: new Date('2026-10-01T08:00:00Z').toISOString()
    },
    {
      id: 'ii-6',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-4',
      inventory_item_id: null,
      description: 'Transformer Commissioning & Power Balancing',
      quantity: 1,
      unit_price: 4100.0,
      total_price: 4100.0,
      created_at: new Date('2026-10-20T08:00:00Z').toISOString()
    }
  ],
  payments: [
    {
      id: 'pay-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      invoice_id: 'inv-2',
      payment_reference: 'WIRE-2026-9041',
      amount: 7500.0,
      payment_method: 'bank_transfer',
      status: 'completed',
      paid_at: new Date('2026-10-25T14:30:00Z').toISOString(),
      recorded_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      notes: 'Wire transfer received from Apex commercial account',
      created_at: new Date('2026-10-25T14:30:00Z').toISOString()
    },
    {
      id: 'pay-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-3',
      payment_reference: 'ACH-2026-4421',
      amount: 1800.0,
      payment_method: 'ach',
      status: 'completed',
      paid_at: new Date('2026-10-18T10:15:00Z').toISOString(),
      recorded_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      notes: 'Automated Clearing House settlement',
      created_at: new Date('2026-10-18T10:15:00Z').toISOString()
    },
    {
      id: 'pay-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      invoice_id: 'inv-4',
      payment_reference: 'CHK-8802',
      amount: 1500.0,
      payment_method: 'check',
      status: 'completed',
      paid_at: new Date('2026-10-25T11:00:00Z').toISOString(),
      recorded_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      notes: 'Deposit check #8802 received',
      created_at: new Date('2026-10-25T11:00:00Z').toISOString()
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      claim_code: 'EXP-2026-001',
      workforce_member_id: 'w1', // David Miller
      workforce_name: 'David Miller',
      work_order_id: 'wo-1',
      claim_date: '2026-10-28',
      category: 'fuel',
      description: 'Emergency mobile generator diesel refueling',
      amount: 145.5,
      receipt_url: 'https://storage.opspilot.internal/receipts/fuel-oct28.pdf',
      receipt_attached: true,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: new Date('2026-10-28T16:00:00Z').toISOString(),
      updated_at: new Date('2026-10-28T16:00:00Z').toISOString()
    },
    {
      id: 'exp-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      claim_code: 'EXP-2026-002',
      workforce_member_id: 'w2', // Elena Rostova
      workforce_name: 'Elena Rostova',
      work_order_id: null,
      claim_date: '2026-10-22',
      category: 'equipment_maintenance',
      description: 'Hydraulic calibration gauge replacement',
      amount: 380.0,
      receipt_url: 'https://storage.opspilot.internal/receipts/gauge-oct22.pdf',
      receipt_attached: true,
      status: 'approved',
      reviewed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Sarah Connor
      reviewed_at: new Date('2026-10-23T10:00:00Z').toISOString(),
      review_notes: 'Approved for urgent tool replacement on-site',
      created_at: new Date('2026-10-22T11:00:00Z').toISOString(),
      updated_at: new Date('2026-10-23T10:00:00Z').toISOString()
    },
    {
      id: 'exp-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      claim_code: 'EXP-2026-003',
      workforce_member_id: 'w3', // Liam Patel
      workforce_name: 'Liam Patel',
      work_order_id: null,
      claim_date: '2026-10-15',
      category: 'travel',
      description: 'Overnight lodging during substation commissioning',
      amount: 210.0,
      receipt_url: 'https://storage.opspilot.internal/receipts/hotel-oct15.pdf',
      receipt_attached: true,
      status: 'reimbursed',
      reviewed_by: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      reviewed_at: new Date('2026-10-16T09:30:00Z').toISOString(),
      review_notes: 'Verified per diem travel allowance',
      created_at: new Date('2026-10-15T19:00:00Z').toISOString(),
      updated_at: new Date('2026-10-16T09:30:00Z').toISOString()
    },
    {
      id: 'exp-4',
      organization_id: '22222222-2222-2222-2222-222222222222', // Apex
      claim_code: 'EXP-APEX-001',
      workforce_member_id: 'w-apex-1',
      workforce_name: 'Marcus Brody',
      work_order_id: null,
      claim_date: '2026-10-30',
      category: 'supplies',
      description: 'Terminal crimping lugs and heatshrink packs',
      amount: 94.2,
      receipt_url: 'https://storage.opspilot.internal/receipts/apex-supplies.pdf',
      receipt_attached: true,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
      created_at: new Date('2026-10-30T14:00:00Z').toISOString(),
      updated_at: new Date('2026-10-30T14:00:00Z').toISOString()
    }
  ],
  expense_approvals: [
    {
      id: 'exp-app-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      expense_id: 'exp-2',
      approver_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      approver_name: 'Sarah Connor',
      decision: 'approved',
      notes: 'Approved for urgent tool replacement on-site',
      decided_at: new Date('2026-10-23T10:00:00Z').toISOString()
    },
    {
      id: 'exp-app-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      expense_id: 'exp-3',
      approver_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      approver_name: 'Sarah Connor',
      decision: 'approved',
      notes: 'Verified per diem travel allowance',
      decided_at: new Date('2026-10-16T09:30:00Z').toISOString()
    }
  ],
  projects: [
    {
      id: 'prj-acme-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_code: 'PRJ-2026-001',
      name: 'Metro Logistics Distribution Center Automation',
      client: 'Metro Retail Distribution Co.',
      customer_id: 'cust-acme-1',
      status: 'in_progress',
      health: 'on_track',
      progress: 68,
      budget: 145000,
      spent: 98600,
      start_date: '2026-09-01',
      target_date: '2026-12-15',
      lead_id: 'w1',
      lead: 'Alex Rivera',
      description:
        'Installation, sensor telemetry integration, and safety certification of automated sorter loading bays.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prj-acme-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_code: 'PRJ-2026-002',
      name: 'Pacific Freight Express Fleet Electrification',
      client: 'Pacific Freight Express',
      status: 'in_progress',
      health: 'at_risk',
      progress: 42,
      budget: 280000,
      spent: 142000,
      start_date: '2026-08-15',
      target_date: '2027-02-28',
      lead_id: 'w1',
      lead: 'Sarah Chen',
      description:
        'Deploying high-output DC fast chargers, power load-balancing transformers, and battery health telemetry.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  project_members: [
    {
      id: 'pm-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      workforce_member_id: 'w1',
      project_role: 'Lead Technician',
      assigned_at: new Date().toISOString()
    },
    {
      id: 'pm-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      workforce_member_id: 'w2',
      project_role: 'Automation Specialist',
      assigned_at: new Date().toISOString()
    },
    {
      id: 'pm-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      workforce_member_id: 'w3',
      project_role: 'Maintenance Lead',
      assigned_at: new Date().toISOString()
    }
  ],
  project_milestones: [
    {
      id: 'ms-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      title: 'Phase 1: Structural Bay Prep & Electrical Conduit',
      status: 'completed',
      target_date: '2026-09-20',
      completed_at: '2026-09-20T00:00:00Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'ms-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      title: 'Phase 2: Conveyor Installation & Hydraulic Test',
      status: 'completed',
      target_date: '2026-10-18',
      completed_at: '2026-10-18T00:00:00Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'ms-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      title: 'Phase 3: Sensor Calibration & Edge Gateway Link',
      status: 'in_progress',
      target_date: '2026-11-20',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'ms-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      project_id: 'prj-acme-1',
      title: 'Phase 4: Regulatory Safety Audit & Signoff',
      status: 'pending',
      target_date: '2026-12-15',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 'tsk-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-101',
      title: 'Inspect hydraulic lift valve pressure on Bay 4',
      category: 'Maintenance',
      priority: 'urgent',
      column_name: 'in_progress',
      column: 'in_progress',
      assigned_to: 'w1',
      project_id: 'prj-acme-1',
      due_date: '2026-11-06',
      checklist_total: 4,
      checklist_completed: 3,
      description: 'Verify hydraulic line safety seals and relief pressure valve tolerance.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tsk-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-102',
      title: 'Calibrate ambient temperature sensors for cold storage',
      category: 'Inspection',
      priority: 'high',
      column_name: 'in_progress',
      column: 'in_progress',
      assigned_to: 'w2',
      project_id: 'prj-acme-1',
      due_date: '2026-11-07',
      checklist_total: 5,
      checklist_completed: 2,
      description: 'Calibrate all wireless sensor probes to +/- 0.1 degree C.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tsk-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-103',
      title: 'Review emergency transformer trenching depth',
      category: 'Compliance',
      priority: 'high',
      column_name: 'todo',
      column: 'todo',
      assigned_to: 'w3',
      project_id: 'prj-acme-2',
      due_date: '2026-11-08',
      checklist_total: 3,
      checklist_completed: 0,
      description: 'Check city municipal utility safety setbacks and cable depths.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tsk-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-104',
      title: 'Quarterly forklift oil filter replacement',
      category: 'Fleet',
      priority: 'normal',
      column_name: 'todo',
      column: 'todo',
      assigned_to: 'w1',
      project_id: 'prj-acme-1',
      due_date: '2026-11-12',
      checklist_total: 2,
      checklist_completed: 0,
      description: 'Perform preventive oil and hydraulic fluid change on Unit 04.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tsk-5',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-105',
      title: 'Sign off emergency power cutoff switch installation',
      category: 'Safety',
      priority: 'urgent',
      column_name: 'review',
      column: 'review',
      assigned_to: 'w2',
      project_id: 'prj-acme-1',
      due_date: '2026-11-09',
      checklist_total: 3,
      checklist_completed: 3,
      description: 'OSHA compliance review of main red kill switch lockout-tagout.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tsk-6',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_code: 'TSK-106',
      title: 'Conveyor roller alignment certification',
      category: 'Maintenance',
      priority: 'normal',
      column_name: 'completed',
      column: 'completed',
      assigned_to: 'w3',
      project_id: 'prj-acme-1',
      due_date: '2026-11-04',
      checklist_total: 4,
      checklist_completed: 4,
      description: 'Completed laser alignment test across 40 meters of conveyor.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  task_assignments: [
    {
      id: 'ta-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_id: 'tsk-1',
      workforce_member_id: 'w1',
      assigned_at: new Date().toISOString()
    },
    {
      id: 'ta-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_id: 'tsk-2',
      workforce_member_id: 'w2',
      assigned_at: new Date().toISOString()
    }
  ],
  task_comments: [
    {
      id: 'tc-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_id: 'tsk-1',
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      comment_text: 'Valve pressure verified to 2400 PSI. Ready for final field load test.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  task_attachments: [
    {
      id: 'ta-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      task_id: 'tsk-1',
      file_name: 'Hydraulic_Inspection_Cert_2026.pdf',
      file_url: '/storage/sample-cert.pdf',
      file_size: 428000,
      mime_type: 'application/pdf',
      uploaded_by: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      created_at: new Date().toISOString()
    }
  ],
  suppliers: [
    {
      id: 'sup-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Grainger Industrial Supply',
      code: 'SUP-GRAINGER',
      contact_name: 'Dan Miller',
      email: 'orders@grainger-supply.com',
      phone: '+1 800-472-4643',
      address: '100 Grainger Pkwy, Lake Forest, IL',
      payment_terms: 'Net 30',
      category: 'Industrial Hardware & Parts',
      status: 'preferred',
      created_at: new Date('2026-01-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-15T08:00:00Z').toISOString()
    },
    {
      id: 'sup-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      name: 'Omega Sensors & Automation',
      code: 'SUP-OMEGA',
      contact_name: 'Elena Rostova',
      email: 'sales@omega-sensors.io',
      phone: '+1 800-826-6342',
      address: '800 Connecticut Ave, Norwalk, CT',
      payment_terms: 'Net 15',
      category: 'Sensors & Automation',
      status: 'active',
      created_at: new Date('2026-02-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-01T08:00:00Z').toISOString()
    },
    {
      id: 'sup-apex-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      name: 'Apex Precision Hydraulics Ltd',
      code: 'SUP-APEX-PREC',
      contact_name: 'Liam Hughes',
      email: 'liam@apex-hydraulics.co.uk',
      phone: '+44 20 7946 0991',
      address: '42 Industrial Park, Manchester, UK',
      payment_terms: 'Net 30',
      category: 'Hydraulics & Seals',
      status: 'active',
      created_at: new Date('2026-02-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-10T08:00:00Z').toISOString()
    }
  ],
  inventory_items: [
    {
      id: 'inv-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      sku: 'HYD-SEAL-044',
      name: 'Industrial Hydraulic Cylinder Seal Kit',
      category: 'Hydraulics',
      supplier_id: 'sup-1',
      supplier_name: 'Grainger Industrial Supply',
      location: 'Warehouse Central • Aisle 4, Bin B-12',
      in_stock: 18,
      reorder_level: 8,
      unit_cost: 38.5,
      status: 'in_stock',
      version: 1,
      created_at: new Date('2026-02-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-01T08:00:00Z').toISOString()
    },
    {
      id: 'inv-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      sku: 'SEN-RTD-100',
      name: 'Platinum RTD Temperature Probe (-50C to +200C)',
      category: 'IoT & Sensors',
      supplier_id: 'sup-2',
      supplier_name: 'Omega Sensors & Automation',
      location: 'Warehouse Central • Aisle 2, Bin S-03',
      in_stock: 4,
      reorder_level: 10,
      unit_cost: 95.0,
      status: 'low_stock',
      version: 1,
      created_at: new Date('2026-02-05T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-05T08:00:00Z').toISOString()
    },
    {
      id: 'inv-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      sku: 'PWR-BRK-480',
      name: '3-Phase 480V 100A Industrial Circuit Breaker',
      category: 'Electrical',
      supplier_id: 'sup-1',
      supplier_name: 'Grainger Industrial Supply',
      location: 'Warehouse Central • Aisle 6, Bin E-01',
      in_stock: 0,
      reorder_level: 3,
      unit_cost: 240.0,
      status: 'out_of_stock',
      version: 1,
      created_at: new Date('2026-02-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-10T08:00:00Z').toISOString()
    },
    {
      id: 'inv-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      sku: 'FLT-OIL-300',
      name: 'Heavy Duty Diesel Spin-on Oil Filter',
      category: 'Fleet & Engine',
      supplier_id: 'sup-1',
      supplier_name: 'Grainger Industrial Supply',
      location: 'Depot Workshop • Shelf 3',
      in_stock: 32,
      reorder_level: 12,
      unit_cost: 22.0,
      status: 'in_stock',
      version: 1,
      created_at: new Date('2026-02-12T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-12T08:00:00Z').toISOString()
    },
    {
      id: 'inv-apex-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      sku: 'APX-VALVE-01',
      name: 'Apex High-Pressure Solenoid Valve',
      category: 'Hydraulics',
      supplier_id: 'sup-apex-1',
      supplier_name: 'Apex Precision Hydraulics Ltd',
      location: 'Depot Manchester • Bay 1',
      in_stock: 15,
      reorder_level: 5,
      unit_cost: 110.0,
      status: 'in_stock',
      version: 1,
      created_at: new Date('2026-02-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-02-15T08:00:00Z').toISOString()
    }
  ],
  stock_transactions: [
    {
      id: 'tx-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      inventory_item_id: 'inv-1',
      item_name: 'Industrial Hydraulic Cylinder Seal Kit',
      sku: 'HYD-SEAL-044',
      transaction_type: 'inbound',
      quantity: 25,
      previous_stock: 0,
      new_stock: 25,
      unit_price: 38.5,
      reference_type: 'purchase_order',
      reference_id: 'po-1',
      idempotency_key: 'idem-seed-001',
      reference_note: 'Initial warehouse inventory intake',
      performed_by: 'Sarah Connor',
      created_at: new Date('2026-10-15T09:00:00Z').toISOString()
    },
    {
      id: 'tx-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      inventory_item_id: 'inv-1',
      item_name: 'Industrial Hydraulic Cylinder Seal Kit',
      sku: 'HYD-SEAL-044',
      transaction_type: 'outbound',
      quantity: 7,
      previous_stock: 25,
      new_stock: 18,
      unit_price: 38.5,
      reference_type: 'work_order',
      reference_id: 'wo-1',
      idempotency_key: 'idem-seed-002',
      reference_note: 'Dispatched for hydraulic lift repair work order',
      performed_by: 'David Kim',
      created_at: new Date('2026-10-20T14:30:00Z').toISOString()
    }
  ],
  assets: [
    {
      id: 'ast-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      asset_tag: 'AST-2026-001',
      name: 'Hydraulic Ramp Lift #4 (Model HR-400)',
      category: 'heavy_machinery',
      status: 'available',
      assigned_to: 'w1',
      assigned_to_name: 'Marcus Vance',
      department: 'Field Operations',
      location: 'Warehouse Central • Dock Bay 4',
      serial_number: 'HR400-8849-B',
      purchase_date: '2025-06-15',
      purchase_cost: 24500.0,
      supplier_id: 'sup-1',
      last_service_date: '2026-10-10',
      next_service_date: '2027-04-10',
      metadata: {
        warranty_months: 24,
        operational_hours: 1420
      },
      maintenance_history: [
        {
          id: 'maint-1',
          date: '2026-10-10',
          type: 'scheduled',
          description: 'Annual hydraulic cylinder inspection and seal lubrication',
          cost: 450.0,
          performed_by: 'David Kim',
          next_service_due: '2027-04-10',
          created_at: new Date('2026-10-10T11:00:00Z').toISOString()
        }
      ],
      created_at: new Date('2025-06-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-10T11:00:00Z').toISOString()
    },
    {
      id: 'ast-2',
      organization_id: '11111111-1111-1111-1111-111111111111',
      asset_tag: 'AST-2026-002',
      name: 'Cummins 500kW Standby Diesel Generator',
      category: 'equipment',
      status: 'available',
      assigned_to: 'w2',
      assigned_to_name: 'Sarah Connor',
      department: 'Central Facilities',
      location: 'Substation B Power Enclosure',
      serial_number: 'CUMM-500-9921',
      purchase_date: '2024-11-20',
      purchase_cost: 68000.0,
      supplier_id: 'sup-1',
      last_service_date: '2026-09-01',
      next_service_date: '2026-12-01',
      metadata: {
        fuel_capacity_gal: 250,
        rated_kw: 500
      },
      maintenance_history: [
        {
          id: 'maint-2',
          date: '2026-09-01',
          type: 'inspection',
          description: 'Quarterly load bank transfer test and oil sampling',
          cost: 320.0,
          performed_by: 'Marcus Vance',
          next_service_due: '2026-12-01',
          created_at: new Date('2026-09-01T10:00:00Z').toISOString()
        }
      ],
      created_at: new Date('2024-11-20T08:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString()
    },
    {
      id: 'ast-apex-1',
      organization_id: '22222222-2222-2222-2222-222222222222',
      asset_tag: 'AST-APEX-001',
      name: 'Apex Field Service Van #12',
      category: 'vehicle',
      status: 'assigned',
      assigned_to: 'w-apex-1',
      assigned_to_name: 'Marcus Brody',
      department: 'Mobile Dispatch',
      location: 'Depot Fleet Lot B',
      serial_number: 'VIN-982189028',
      purchase_date: '2025-01-10',
      purchase_cost: 42000.0,
      supplier_id: 'sup-apex-1',
      last_service_date: '2026-08-15',
      next_service_date: '2027-02-15',
      metadata: {
        mileage: 18450
      },
      maintenance_history: [],
      created_at: new Date('2025-01-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-08-15T08:00:00Z').toISOString()
    }
  ],
  purchase_orders: [
    {
      id: 'po-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      po_number: 'PO-2026-001',
      supplier_id: 'sup-1',
      supplier_name: 'Grainger Industrial Supply',
      order_date: '2026-10-10',
      status: 'received',
      total_amount: 962.5,
      items: [
        {
          item_id: 'inv-1',
          sku: 'HYD-SEAL-044',
          name: 'Industrial Hydraulic Cylinder Seal Kit',
          quantity: 25,
          unit_price: 38.5,
          total: 962.5
        }
      ],
      notes: 'Q4 initial warehouse replenishment batch',
      created_at: new Date('2026-10-10T08:00:00Z').toISOString(),
      updated_at: new Date('2026-10-15T09:00:00Z').toISOString()
    }
  ],
  auditLogs: []
};

export { supabaseAdmin };
export default supabaseAdmin;
