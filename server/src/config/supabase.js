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
      request_code: 'SR-2026-001',
      title: 'MRI Cooling Loop Flow Failure',
      description: 'Chilled water flow in MRI suite Bay 3 dropped below safe operating threshold.',
      location: 'Main Medical Tower - Radiology Bay 3',
      service_type: 'repair',
      status: 'assigned',
      urgency: 'critical',
      step: 3,
      eta: 'Today at 02:30 PM',
      assigned_to: 'w1',
      assigned_technician: 'David Miller',
      created_at: new Date('2026-11-04T08:30:00Z').toISOString(),
      updated_at: new Date('2026-11-04T09:00:00Z').toISOString()
    },
    {
      id: 'sr-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      request_code: 'SR-APEX-001',
      title: 'Substation Transformer Overheating',
      description: 'Transformer 4 thermal sensor reporting 88C under normal load.',
      location: 'Substation Yard East',
      service_type: 'safety',
      status: 'new',
      urgency: 'high',
      step: 1,
      eta: 'Awaiting Dispatch',
      assigned_to: null,
      assigned_technician: null,
      created_at: new Date('2026-11-03T11:00:00Z').toISOString(),
      updated_at: new Date('2026-11-03T11:00:00Z').toISOString()
    },
    {
      id: 'sr-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-2',
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
      created_at: new Date('2026-11-04T12:00:00Z').toISOString(),
      updated_at: new Date('2026-11-04T12:00:00Z').toISOString()
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      invoice_number: 'INV-2026-001',
      issue_date: '2026-11-01',
      due_date: '2026-11-30',
      subtotal: 2950.0,
      tax: 250.0,
      total: 3200.0,
      status: 'pending',
      desc: 'Monthly Scheduled Chiller & HVAC Facility Maintenance',
      items: [
        {
          id: 'ii-1',
          description: 'Preventative Chiller Maintenance',
          quantity: 1,
          unit_price: 2450.0,
          total_price: 2450.0
        },
        {
          id: 'ii-2',
          description: 'High-Pressure Refrigerant Seal Replacement',
          quantity: 2,
          unit_price: 250.0,
          total_price: 500.0
        }
      ],
      created_at: new Date('2026-11-01T08:00:00Z').toISOString()
    },
    {
      id: 'inv-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      customer_id: 'cust-apex-1',
      invoice_number: 'INV-APEX-001',
      issue_date: '2026-10-15',
      due_date: '2026-11-15',
      subtotal: 6800.0,
      tax: 700.0,
      total: 7500.0,
      status: 'paid',
      desc: 'High-Voltage Switchgear Preventive Maintenance',
      items: [
        {
          id: 'ii-3',
          description: 'Switchgear Busbar Inspection & Thermal Scan',
          quantity: 1,
          unit_price: 6800.0,
          total_price: 6800.0
        }
      ],
      created_at: new Date('2026-10-15T09:00:00Z').toISOString()
    },
    {
      id: 'inv-3',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-1',
      invoice_number: 'INV-2026-092',
      issue_date: '2026-10-01',
      due_date: '2026-10-31',
      subtotal: 1650.0,
      tax: 150.0,
      total: 1800.0,
      status: 'paid',
      desc: 'Quarterly Sensor Calibration & Safety Certifications',
      items: [
        {
          id: 'ii-4',
          description: 'Precision Temperature Sensor Recalibration (x6)',
          quantity: 6,
          unit_price: 200.0,
          total_price: 1200.0
        },
        {
          id: 'ii-5',
          description: 'OSHA / Facility Safety Certification Documentation',
          quantity: 1,
          unit_price: 450.0,
          total_price: 450.0
        }
      ],
      created_at: new Date('2026-10-01T08:00:00Z').toISOString()
    },
    {
      id: 'inv-4',
      organization_id: '11111111-1111-1111-1111-111111111111',
      customer_id: 'cust-acme-2',
      invoice_number: 'INV-2026-044',
      issue_date: '2026-10-20',
      due_date: '2026-11-20',
      subtotal: 4100.0,
      tax: 400.0,
      total: 4500.0,
      status: 'pending',
      desc: 'EV Fast Charger Installation & High-Voltage Transformers',
      items: [
        {
          id: 'ii-6',
          description: 'Transformer Commissioning',
          quantity: 1,
          unit_price: 4100.0,
          total_price: 4100.0
        }
      ],
      created_at: new Date('2026-10-20T08:00:00Z').toISOString()
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
  auditLogs: []
};

export { supabaseAdmin };
export default supabaseAdmin;
