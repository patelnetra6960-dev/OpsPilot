# OpsPilot — PostgreSQL Database Foundation & Supabase Architecture Guide

This document defines the complete PostgreSQL database foundation, Supabase local development stack, migration management, and Row-Level Security (RLS) architecture for **OpsPilot** — an enterprise multi-tenant Operations & Workforce Management SaaS.

---

## 1. Architectural Overview & Multi-Tenant Foundation

OpsPilot utilizes a **multi-tenant shared database with row-level tenant partitioning** powered by PostgreSQL 15+ and Supabase. Every domain entity is strictly isolated by `organization_id`.

```mermaid
flowchart TD
    subgraph "Clients & Ingress"
        ViteClient["React 19 Frontend\n(Anon Key Only)"]
        ExternalAPI["External Webhooks / API"]
    end

    subgraph "Application Layer (Node.js Express)"
        AuthMiddleware["requireAuth\n(GoTrue JWT Verification)"]
        TenantMiddleware["requireTenant\n(Extracts & Validates X-Tenant-Id)"]
        ModularMonolith["Domain Modules\n(Workforce, Shifts, Work Orders, Invoices)"]
    end

    subgraph "Database Layer (Supabase PostgreSQL 15+)"
        RLS["PostgreSQL Row Level Security (RLS)"]
        HelperFunctions["Security Definer Functions:\n• is_member_of(org_id)\n• has_org_role(org_id, roles)\n• is_superadmin()"]
        PartitionedTables["Tenant-Partitioned Tables\n(18 Domain Tables with organization_id FK)"]
        AuditLog["Immutable Audit Logs\n(Append-Only / No Update or Delete)"]
        StorageEngine["Supabase Storage Buckets\n(org-assets, org-documents, work-order-photos)"]
    end

    ViteClient -->|HTTP + Bearer JWT + X-Tenant-Id| AuthMiddleware
    AuthMiddleware --> TenantMiddleware
    TenantMiddleware --> ModularMonolith
    ModularMonolith -->|PostgreSQL Query with Org Context| RLS
    RLS --> HelperFunctions
    HelperFunctions --> PartitionedTables
    ModularMonolith --> AuditLog
    ViteClient -->|Direct Upload to Storage| StorageEngine
```

### Core Design Tenets:

1. **Never Trust the Client:** Authorization and tenant boundaries are strictly enforced at the database level via PostgreSQL RLS policies in addition to backend Express middleware.
2. **Zero Hard Deletes on Operational Data:** All mutable domain tables implement universal soft deletion (`deleted_at TIMESTAMPTZ DEFAULT NULL`) with partial B-tree indexes for active records.
3. **Strict Credential Boundary:** Frontend clients only ever receive the public anonymous key (`VITE_SUPABASE_ANON_KEY`). The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) and database password are strictly restricted to the backend Express server.

---

## 2. Supabase Project Connections & Credentials

OpsPilot supports both **Local Development via Docker** and **Hosted Supabase Cloud Projects**.

### 2.1 Connection Endpoints & Port Reference

| Component              | Local Development             | Hosted Production / Staging                    | Usage                                          |
| ---------------------- | ----------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| **REST / GraphQL API** | `http://localhost:54321`      | `https://<project-ref>.supabase.co`            | Supabase JavaScript Client API                 |
| **PostgreSQL Direct**  | `localhost:54322`             | `db.<project-ref>.supabase.com:5432`           | Schema migrations, DDL, direct DBA tasks       |
| **Transaction Pooler** | `localhost:54329` (PgBouncer) | `aws-0-<region>.pooler.supabase.com:6543`      | High-concurrency Express backend connection    |
| **Supabase Studio**    | `http://localhost:54323`      | `https://supabase.com/dashboard/project/<ref>` | Visual database management GUI                 |
| **Inbucket (Email)**   | `http://localhost:54324`      | Supabase Cloud SMTP Settings                   | Local auth email inspection (Magic links/OTPs) |

### 2.2 Environment Variables Matrix

```bash
# Frontend (.env) - Publicly Accessible
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh... (Public Anon Key)
VITE_API_URL=http://localhost:5000/api

# Backend (server/.env) - Private Server Only
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJh... (Public Anon Key)
SUPABASE_SERVICE_ROLE_KEY=eyJh... (Private Admin Bypass Key)
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
# DATABASE_POOLER_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

> [!CAUTION]
> Under no circumstances should `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, or `DATABASE_URL` be placed in frontend code, client `.env` files, or committed to GitHub. OpsPilot includes an automated scanner (`npm run check:env`) that fails CI if client leaks are detected.

---

## 3. Local Development with Supabase CLI

The local Supabase development environment runs a containerized stack matching the cloud Supabase environment.

### 3.1 CLI Configuration: `supabase/config.toml`

The local environment is configured in [`supabase/config.toml`](file:///c:/Downloads/OpsPilot/supabase/config.toml):

- **Project ID:** `opspilot`
- **Postgres Engine:** PostgreSQL 15+ (major version 15/17 supported)
- **API Port:** `54321` | **DB Port:** `54322` | **Studio Port:** `54323`
- **Auth Site URL:** `http://localhost:5173` (OpsPilot React Frontend)
- **Email Confirmations:** Disabled locally for rapid developer onboarding

### 3.2 Management Commands Cheat-Sheet

```bash
# Start local Supabase Docker stack (PostgreSQL, GoTrue, PostgREST, Storage, Studio)
npm run db:start

# Inspect status, URLs, and local credentials
npm run db:status

# Stop local Supabase containers
npm run db:stop

# Reset local database (re-runs all migrations and seed data from scratch)
npm run db:reset

# Run node-based migration runner (checks syntax offline, or executes against live DATABASE_URL)
npm run db:migrate

# Apply initial test seeds (organizations, users, workforce, inventory, projects)
npm run db:seed
```

---

## 4. Migration Architecture & Directory Structure

To prevent uncontrolled database drift, all schema changes are managed via **sequential, modular SQL migration files**. Each migration represents an isolated domain or security tier.

```
supabase/
├── config.toml           # Supabase CLI local development stack configuration
├── seed.sql              # Initial local development seed data
└── migrations/           # Canonical SQL migrations executed in alphabetical order
    ├── 001_core_extensions_and_tenants.sql
    ├── 002_workforce_management.sql
    ├── 003_shifts_and_attendance.sql
    ├── 004_assets_and_inventory.sql
    ├── 005_clients_and_projects.sql
    ├── 006_work_orders_and_dispatch.sql
    ├── 007_expenses_and_invoices.sql
    ├── 008_audit_logs_and_triggers.sql
    ├── 009_comprehensive_rls_policies.sql
    └── 010_storage_buckets_and_rls.sql
```

> [!NOTE]
> The `database/migrations/` directory is synchronized 1:1 with `supabase/migrations/` so that both the official `supabase db reset` command and the standalone Node.js migration runner (`npm run migrate`) execute identical schema definitions.

---

## 5. Database Conventions & Standards

### 5.1 Naming Conventions

- **Tables:** Plural, lowercase, snake_case (`organizations`, `workforce_members`, `work_orders`, `inventory_items`).
- **Columns:** Singular, lowercase, snake_case (`organization_id`, `employee_code`, `hourly_rate`).
- **Primary Keys:** Always named `id` of type `UUID` with `DEFAULT gen_random_uuid()`.
- **Foreign Keys:** Named `<singular_entity>_id` with explicit foreign key constraints (`REFERENCES public.<plural_entity>(id)`).
- **Constraints:** Explicitly named using prefixes:
  - Unique: `uq_<table_name>_<columns>` (e.g., `uq_workforce_org_employee_code`)
  - Check: `chk_<table_name>_<rule>` (e.g., `chk_shift_time_order`)
  - Foreign Key: `fk_<table_name>_<reference>`

### 5.2 Universal Timestamps & Automated Trigger

Every domain table maintains:

- `created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
- `updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`

The universal trigger function `public.set_updated_at()` is attached to all mutable tables:

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_<table_name>_updated_at
    BEFORE UPDATE ON public.<table_name>
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
```

### 5.3 Universal Soft Deletion

To preserve historical records and protect against accidental cascades:

- `deleted_at TIMESTAMPTZ DEFAULT NULL`
- Partial index created for query acceleration:
  ```sql
  CREATE INDEX idx_<table_name>_active ON public.<table_name>(organization_id) WHERE deleted_at IS NULL;
  ```

---

## 6. Table Dictionary & Schema Reference

### Core Architecture & Identity

1. **`organizations`** — Multi-tenant customer accounts/organizations with tier (`starter`, `growth`, `enterprise`), active state, and JSONB settings.
2. **`users_profiles`** — Identity profiles mapped to Supabase Auth `auth.users(id)`. Contains email, full name, phone, and `is_superadmin` flag.
3. **`organization_members`** — Tenant RBAC mapping table connecting users to organizations with role (`owner`, `admin`, `manager`, `employee`, `customer`, `member`) and membership status (`active`, `invited`, `suspended`).

### Workforce & Operations

4. **`workforce_members`** — Tenant staff roster with employee code, department, designation, employment type (`full_time`, `part_time`, `contract`, `intern`), hourly rate, and skill tags.
5. **`shift_schedules`** — Shift rosters with scheduled start/end timestamps, department, location coordinates, and operational notes.
6. **`attendance_records`** — Real-time clock-in/out records with GPS coordinates (`clock_in_lat`, `clock_in_lng`), geofence verification flag, total hours, break tracking, and manager approval status.
7. **`assets`** — Equipment and fleet registry with asset tag, category (`vehicle`, `heavy_machinery`, `diagnostic_tool`, `equipment`), operational status, maintenance schedule, and technician checkout assignment.
8. **`inventory_items`** — Warehouse spare parts catalog with SKU, storage bin location, stock counter (`in_stock`), reorder threshold (`reorder_level`), unit cost, and stock status (`in_stock`, `low_stock`, `out_of_stock`).

### Clients, Projects & Dispatch

9. **`clients`** — Customer accounts directory with contact person, address, SLA tier (`standard`, `priority`, `critical`, `premium`), and status.
10. **`projects`** — Multi-phase field client projects with budget burndown, milestone completion percentage, health status (`on_track`, `at_risk`, `delayed`), and assigned project lead.
11. **`project_milestones`** — Delivery phases linked to projects with target due date and completed status.
12. **`service_requests`** — Customer support and maintenance tickets with SLA urgency (`critical`, `urgent`, `high`, `normal`), triage status (`new`, `assigned`, `converted`), and 1-click conversion link to work orders.
13. **`work_orders`** — Dispatched field engineering jobs with work order code (`WO-8421`), technician assignment, asset allocation, site location, schedule window, cost estimate, and customer signature URL.
14. **`work_order_checklists`** — Step-by-step compliance and safety checklist items linked to work orders with sequential sort orders and timestamped completions.
15. **`tasks`** — Agile 4-column Kanban operational board (`todo`, `in_progress`, `review`, `completed`) with priority, checklist tallies, and due dates.

### Financials & Governance

16. **`expense_claims`** — Out-of-pocket and fuel expense claims with Grainger/fuel receipt links, amount, work order association, and manager review lifecycle (`pending`, `approved`, `rejected`, `reimbursed`).
17. **`invoices`** — Accounts receivable billing statements with invoice number, client reference, subtotal, tax, total, due date, and payment status (`draft`, `pending`, `paid`, `overdue`).
18. **`invoice_items`** — Itemized billing line items with description, quantity, unit price, and line totals.
19. **`audit_logs`** — Tamper-proof, append-only security log recording user actions, entity types, old/new JSONB values, and IP addresses. Protected against UPDATE and DELETE operations via PostgreSQL rules.

---

## 7. Row-Level Security (RLS) Architecture

Row-Level Security is enabled across **all 18 public domain tables**.

### 7.1 Security Definer Helper Functions

To ensure fast, cached permission checks without circular policy recursion, OpsPilot relies on three `SECURITY DEFINER STABLE` functions:

```sql
-- 1. Check if user is an active member of the specified organization
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Check if user has an authorized role in the organization
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND status = 'active'
          AND role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Check if user has platform Super Admin privileges
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.users_profiles
        WHERE id = auth.uid()
          AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 7.2 Multi-Tenant Policy Pattern

Every tenant-partitioned table applies the standard RLS isolation template:

```sql
-- SELECT Policy
CREATE POLICY "Tenant Isolation Select on <table_name>"
    ON public.<table_name> FOR SELECT
    USING (public.is_member_of(organization_id) OR public.is_superadmin());

-- INSERT Policy
CREATE POLICY "Tenant Isolation Insert on <table_name>"
    ON public.<table_name> FOR INSERT
    WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());

-- UPDATE Policy
CREATE POLICY "Tenant Isolation Update on <table_name>"
    ON public.<table_name> FOR UPDATE
    USING (public.is_member_of(organization_id) OR public.is_superadmin())
    WITH CHECK (public.is_member_of(organization_id) OR public.is_superadmin());

-- DELETE Policy (Restricted to Tenant Owners / Admins)
CREATE POLICY "Tenant Isolation Delete on <table_name>"
    ON public.<table_name> FOR DELETE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']) OR public.is_superadmin());
```

---

## 8. Supabase Storage Buckets & Policies

OpsPilot configures three storage buckets with tenant-prefixed object paths:

| Bucket Name         | Visibility | File Size Limit | Allowed MIME Types        | Folder Partitioning                                          |
| ------------------- | ---------- | --------------- | ------------------------- | ------------------------------------------------------------ |
| `org-assets`        | Public     | 5 MB            | PNG, JPEG, SVG, WebP      | `<organization_id>/avatars/*`, `<organization_id>/logos/*`   |
| `org-documents`     | Private    | 50 MB           | PDF, DOC, DOCX, PNG, JPEG | `<organization_id>/contracts/*`, `<organization_id>/certs/*` |
| `work-order-photos` | Private    | 25 MB           | PNG, JPEG, WebP           | `<organization_id>/<work_order_id>/*`                        |

### Storage Isolation Policy

All private document requests enforce folder prefix verification:

```sql
CREATE POLICY "Tenant Members can read tenant documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id IN ('org-documents', 'work-order-photos') AND
        (storage.foldername(name))[1]::uuid IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
```

---

## 9. Verification & Quality Assurance

To verify that the database architecture is healthy, consistent, and secure:

```bash
# 1. Run full test suite (32 passing tests including database contract tests)
npm test

# 2. Verify environment variables and credential safety
npm run check:env

# 3. Dry-run and check syntax integrity of all 10 SQL migrations
npm run migrate

# 4. Check ESLint and AST scope analyzer (0 errors, 0 warnings)
npm run lint

# 5. Check Prettier code formatting
npm run format:check
```
