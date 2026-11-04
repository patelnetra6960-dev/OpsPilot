-- OpsPilot Seed Data: seed.sql
-- Seed organizations, mock users, members, and workforce

-- Sample Organizations
INSERT INTO public.organizations (id, name, slug, subscription_tier, settings)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Acme Logistics Global', 'acme-logistics', 'enterprise', '{"timezone": "America/New_York", "currency": "USD"}'),
    ('22222222-2222-2222-2222-222222222222', 'Apex Field Services', 'apex-field-services', 'growth', '{"timezone": "Europe/London", "currency": "GBP"}')
ON CONFLICT (id) DO NOTHING;

-- Sample Users Profiles
INSERT INTO public.users_profiles (id, email, full_name, avatar_url, is_superadmin)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alex.director@acme.com', 'Alex Rivera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sarah.ops@acme.com', 'Sarah Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'marcus.lead@apex.com', 'Marcus Vance', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', false)
ON CONFLICT (id) DO NOTHING;

-- Sample Organization Memberships
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active'),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Sample Workforce Directory (Tenant Isolated)
INSERT INTO public.workforce_members (organization_id, employee_code, first_name, last_name, email, department, designation, employment_type, status, hourly_rate)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'EMP-ACME-001', 'David', 'Miller', 'david.m@acme.com', 'Fleet Operations', 'Lead Fleet Dispatcher', 'full_time', 'active', 42.50),
    ('11111111-1111-1111-1111-111111111111', 'EMP-ACME-002', 'Elena', 'Rostova', 'elena.r@acme.com', 'Warehouse Logistics', 'Inventory Supervisor', 'full_time', 'active', 38.00),
    ('11111111-1111-1111-1111-111111111111', 'EMP-ACME-003', 'Liam', 'Patel', 'liam.p@acme.com', 'Field Operations', 'Mobile Technician', 'contract', 'active', 45.00),
    ('22222222-2222-2222-2222-222222222222', 'EMP-APEX-001', 'Oliver', 'Smith', 'oliver.s@apex.com', 'HVAC Operations', 'Senior Technician', 'full_time', 'active', 50.00),
    ('22222222-2222-2222-2222-222222222222', 'EMP-APEX-002', 'Sophia', 'Taylor', 'sophia.t@apex.com', 'Customer Support', 'Dispatcher Coordinator', 'full_time', 'active', 32.00)
ON CONFLICT (organization_id, employee_code) DO NOTHING;

-- Sample Audit Log Entries
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values, ip_address)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TENANT_CREATED', 'ORGANIZATION', '11111111-1111-1111-1111-111111111111', '{"name": "Acme Logistics Global"}', '127.0.0.1'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TENANT_CREATED', 'ORGANIZATION', '22222222-2222-2222-2222-222222222222', '{"name": "Apex Field Services"}', '127.0.0.1');
