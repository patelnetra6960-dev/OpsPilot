-- OpsPilot Comprehensive Database Seed: seed.sql
-- Description: Seeds multi-tenant organizations, users, workforce, assets, inventory, clients, projects, work orders, tasks, expenses & invoices

-- 1. Organizations (Tenants)
INSERT INTO public.organizations (id, name, slug, subscription_tier, is_active, settings)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Acme Logistics Global', 'acme-logistics', 'enterprise', true, '{"timezone": "America/New_York", "currency": "USD", "theme": "dark"}'),
    ('22222222-2222-2222-2222-222222222222', 'Apex Field Services', 'apex-field-services', 'growth', true, '{"timezone": "Europe/London", "currency": "GBP", "theme": "light"}')
ON CONFLICT (id) DO NOTHING;

-- 2. Users Profiles
INSERT INTO public.users_profiles (id, email, full_name, avatar_url, phone, is_superadmin)
VALUES 
    ('ssssssss-ssss-ssss-ssss-ssssssssssss', 'elena.admin@opspilot.internal', 'Elena Rostova', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', '+1 (555) 000-0001', true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alex.director@acme.com', 'Alex Rivera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '+1 (555) 123-4567', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'sarah.ops@acme.com', 'Sarah Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+1 (555) 234-5678', false),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'david.tech@acme.com', 'David Kim', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+1 (555) 345-6789', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'marcus.lead@apex.com', 'Marcus Vance', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '+44 20 7946 0912', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Organization Memberships
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active'),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager', 'active'),
    ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'employee', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 4. Workforce Directory
INSERT INTO public.workforce_members (id, organization_id, user_id, employee_code, first_name, last_name, email, phone, department, designation, employment_type, status, hourly_rate, skills)
VALUES 
    ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'EMP-ACME-001', 'David', 'Kim', 'david.tech@acme.com', '+1 (555) 345-6789', 'Field Logistics', 'Senior Field Technician', 'full_time', 'active', 42.50, ARRAY['Hydraulics', 'High Voltage', 'Diagnostics']),
    ('11111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL, 'EMP-ACME-002', 'Emily', 'Davis', 'emily.d@acme.com', '+1 (555) 456-7890', 'Fleet Operations', 'Logistics Coordinator', 'full_time', 'active', 38.00, ARRAY['Fleet Telematics', 'Dispatching']),
    ('11111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL, 'EMP-ACME-003', 'Carlos', 'Mendez', 'carlos.m@acme.com', '+1 (555) 567-8901', 'Maintenance & Safety', 'Lead Maintenance Specialist', 'full_time', 'active', 45.00, ARRAY['HVAC', 'Chillers', 'Diesel Engines']),
    ('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'EMP-APEX-001', 'Marcus', 'Vance', 'marcus.lead@apex.com', '+44 20 7946 0912', 'Operations', 'Field Director', 'full_time', 'active', 55.00, ARRAY['Safety Audits', 'Electrical Systems'])
ON CONFLICT (organization_id, employee_code) DO NOTHING;

-- 5. Equipment Assets
INSERT INTO public.assets (id, organization_id, asset_tag, name, category, status, assigned_to)
VALUES 
    ('11111111-aaaa-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'AST-VAN-01', 'Ford Transit Heavy Cargo Van #1', 'vehicle', 'available', '11111111-0000-0000-0000-000000000001'),
    ('11111111-aaaa-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'AST-RAMP-04', 'Hydraulic Ramp Lift #4 (Model HR-400)', 'heavy_machinery', 'assigned', '11111111-0000-0000-0000-000000000001'),
    ('11111111-aaaa-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'AST-GEN-500', 'Cummins 500kW Standby Diesel Generator', 'equipment', 'maintenance', '11111111-0000-0000-0000-000000000003')
ON CONFLICT (organization_id, asset_tag) DO NOTHING;

-- 6. Inventory & Spare Parts
INSERT INTO public.inventory_items (id, organization_id, sku, name, category, location, in_stock, reorder_level, unit_cost, status)
VALUES 
    ('11111111-bbbb-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'HYD-SEAL-044', 'Industrial Hydraulic Cylinder Seal Kit', 'Hydraulics', 'Warehouse Central • Aisle 4, Bin B-12', 18, 8, 38.50, 'in_stock'),
    ('11111111-bbbb-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'SEN-RTD-100', 'Platinum RTD Temperature Probe (-50C to +200C)', 'IoT & Sensors', 'Warehouse Central • Aisle 2, Bin S-03', 4, 10, 95.00, 'low_stock'),
    ('11111111-bbbb-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'PWR-BRK-480', '3-Phase 480V 100A Industrial Circuit Breaker', 'Electrical', 'Warehouse Central • Aisle 6, Bin E-01', 0, 3, 240.00, 'out_of_stock')
ON CONFLICT (organization_id, sku) DO NOTHING;

-- 7. Clients & Customer Accounts
INSERT INTO public.clients (id, organization_id, name, contact_person, email, phone, address, sla_tier, status)
VALUES 
    ('11111111-cccc-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Metro Retail Distribution Co.', 'Olivia Parker', 'olivia@metrodistribution.com', '+1 (555) 987-6543', '100 Metro Parkway, Chicago, IL', 'critical', 'active'),
    ('11111111-cccc-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pacific Freight Express', 'Marcus Vance', 'marcus@pacificfreight.com', '+1 (555) 876-5432', '450 Harbor Boulevard, Seattle, WA', 'priority', 'active'),
    ('11111111-cccc-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Harbor Cold Chain Logistics', 'David Miller', 'david@harborcold.com', '+1 (555) 765-4321', '88 Pier Terminal Road, Newark, NJ', 'standard', 'active')
ON CONFLICT (id) DO NOTHING;

-- 8. Projects & Milestones
INSERT INTO public.projects (id, organization_id, client_id, project_code, name, description, status, health, progress, budget, spent, start_date, target_date, lead_id)
VALUES 
    ('11111111-dddd-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-cccc-0000-0000-000000000001', 'PRJ-2026-01', 'Metro Distribution Center Automation', 'Sensor telemetry integration and bay prep', 'in_progress', 'on_track', 68, 145000.00, 98600.00, '2026-09-01', '2026-12-15', '11111111-0000-0000-0000-000000000001')
ON CONFLICT (organization_id, project_code) DO NOTHING;

INSERT INTO public.project_milestones (id, organization_id, project_id, title, status, target_date)
VALUES 
    ('11111111-dddd-1111-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-dddd-0000-0000-000000000001', 'Phase 1: Structural Bay Prep & Electrical Conduit', 'completed', '2026-09-20'),
    ('11111111-dddd-1111-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-dddd-0000-0000-000000000001', 'Phase 2: Conveyor Installation & Hydraulic Test', 'completed', '2026-10-18'),
    ('11111111-dddd-1111-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-dddd-0000-0000-000000000001', 'Phase 3: Sensor Calibration & Edge Gateway Link', 'in_progress', '2026-11-20')
ON CONFLICT (id) DO NOTHING;

-- 9. Work Orders & Checklists
INSERT INTO public.work_orders (id, organization_id, work_order_code, title, client_id, assigned_to, asset_id, site, priority, status, scheduled_start, cost_estimate, progress)
VALUES 
    ('11111111-eeee-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'WO-8421', 'Hydraulic Loading Ramp Periodic Inspection & Seal Repair', '11111111-cccc-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '11111111-aaaa-0000-0000-000000000002', 'Metro Central Bay 4', 'high', 'in_progress', '2026-11-04 08:30:00Z', 850.00, 75)
ON CONFLICT (organization_id, work_order_code) DO NOTHING;

INSERT INTO public.work_order_checklists (id, organization_id, work_order_id, item_text, is_completed, sort_order)
VALUES 
    ('11111111-eeee-1111-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-eeee-0000-0000-000000000001', 'Check hydraulic oil reservoir level and fluid viscosity', true, 1),
    ('11111111-eeee-1111-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-eeee-0000-0000-000000000001', 'Replace worn rubber piston seals', true, 2),
    ('11111111-eeee-1111-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-eeee-0000-0000-000000000001', 'Perform 10-ton load drop pressure test', true, 3),
    ('11111111-eeee-1111-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-eeee-0000-0000-000000000001', 'Log safety certificate in tenant document vault', false, 4)
ON CONFLICT (id) DO NOTHING;

-- 10. Audit Logs
INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values, ip_address)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TENANT_INITIALIZED', 'ORGANIZATION', '11111111-1111-1111-1111-111111111111', '{"name": "Acme Logistics Global"}', '127.0.0.1'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TENANT_INITIALIZED', 'ORGANIZATION', '22222222-2222-2222-2222-222222222222', '{"name": "Apex Field Services"}', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;
