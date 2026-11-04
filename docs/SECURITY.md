# OpsPilot Multi-Tenant Isolation & Row Level Security (RLS) Specification

**Document Version:** 1.0.0  
**Status:** Approved & Enforced  
**Applicability:** Production Monorepo (`client/`, `server/`, `database/`, `supabase/`)  
**Compliance Standard:** ISO 27001 / SOC 2 Type II Multi-Tenant Security Standards

---

## 1. Executive Summary & Security Objectives

OpsPilot implements an enterprise-grade multi-tenant architecture utilizing a **Defense-in-Depth** model. Multi-tenant isolation is enforced at every layer of the technology stack—from HTTP request headers and Express.js middleware down to PostgreSQL Row Level Security (RLS) and database engine anti-tamper triggers.

### Core Security Mandates:

1. **Zero Trust at the Data Layer:** Frontend routing or API gateway filtering is never presumed sufficient. Every single database query executed by an authenticated user is scoped by PostgreSQL Row Level Security (RLS).
2. **Absolute Multi-Tenant Partitioning:** Every organization-owned domain record is permanently linked via a mandatory foreign key (`organization_id UUID NOT NULL REFERENCES public.organizations(id)`).
3. **Immutability of Tenant Ownership:** Cross-tenant resource migration is blocked at the database engine level via triggers. No user (including organization owners) can reassign a record's `organization_id`.
4. **Segregation of Platform vs. Tenant Roles:** Platform Super Administrator privileges exist solely at the system level (`user_profiles.is_superadmin`) and cannot be granted or escalated through tenant-level roles.
5. **Strict Customer Portal Isolation:** External customer accounts have access exclusively to their own service requests, work orders, invoices, and payments. Internal operations (workforce directory, assets, inventory, suppliers, internal expenses, audit logs) are entirely invisible and inaccessible to customer accounts.
6. **Self-Role Escalation Prevention:** No user can modify their own role in `organization_memberships`. Promotion to privileged roles (`owner`, `admin`) requires explicit authorization from an existing organization owner.
7. **Hardened SECURITY DEFINER Execution:** All database helper functions operate with explicit `search_path = public, pg_temp` sanitization and have default `PUBLIC` execution privileges revoked.

---

## 2. Multi-Tenant Threat Model & Mitigation Matrix

| Threat Vector                   | Attack Scenario                                                                                                 | Defense & Mitigation Mechanism                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-Tenant Data Leakage**   | Tenant A attempts to read invoices or customer data belonging to Tenant B by spoofing IDs.                      | **Multi-Layer:** Express `requireTenant` validates tenant membership; PostgreSQL RLS policies enforce `public.is_member_of(organization_id)` on all tables.               |
| **Cross-Tenant Data Hijacking** | Malicious admin attempts an SQL `UPDATE invoices SET organization_id = 'org-b'` to move records across tenants. | **Database Trigger:** `prevent_organization_reassignment()` fires `BEFORE UPDATE` on all tenant tables and raises exception `42501` if `organization_id` differs.         |
| **Self-Role Escalation**        | Employee or Manager issues `UPDATE organization_memberships SET role = 'owner' WHERE user_id = auth.uid()`.     | **Database Trigger:** `prevent_self_role_escalation()` blocks any update to `role` where `auth.uid() = user_id`, raising exception `42501`.                               |
| **Super Admin Elevation**       | Regular tenant admin updates `user_profiles SET is_superadmin = true`.                                          | **Database Trigger:** `prevent_superadmin_escalation()` verifies `public.is_superadmin()` before allowing changes to `is_superadmin`.                                     |
| **Customer Portal Spying**      | Customer account queries `/api/workforce` or database `inventory_items` to inspect internal operational data.   | **RLS & Middleware:** Customers are excluded from internal tables (`NOT public.has_org_role(organization_id, ARRAY['customer'])`); `requireTenantRole` blocks API access. |
| **Cross-Customer Breach**       | Customer 1 queries `service_requests` or `invoices` with Customer 2's ID.                                       | **RLS Policy:** Customer queries are strictly filtered by `customer_id = public.get_customer_id(organization_id)`.                                                        |
| **Audit Log Tampering**         | Malicious insider attempts to alter or delete audit trails after unauthorized actions.                          | **Append-Only Rules:** PostgreSQL rules `no_update_audit_logs` and `no_delete_audit_logs` perform `DO INSTEAD NOTHING`.                                                   |
| **Search Path Hijacking**       | Attacker creates malicious functions in temp schemas targeting `SECURITY DEFINER` functions.                    | **Search Path Pinning:** Every `SECURITY DEFINER` function explicitly specifies `SET search_path = public, pg_temp;`.                                                     |

---

## 3. Defense-in-Depth Layered Architecture

```mermaid
flowchart TD
    subgraph Layer1["1. Network & Reverse Proxy Layer"]
        A["TLS 1.3 Termination"] --> B["CORS & Request Rate Limiting"]
    end

    subgraph Layer2["2. Authentication Gateway Layer"]
        B --> C["authMiddleware: Supabase JWT Verification"]
        C --> D["Context Injection: req.user, req.token"]
    end

    subgraph Layer3["3. Multi-Tenant Boundary Enforcement"]
        D --> E["tenantMiddleware: Header X-Tenant-Id Resolution"]
        E --> F{"Active Membership in Org?"}
        F -- "No (and not superadmin)" --> G["403 Forbidden: FORBIDDEN_CROSS_TENANT_ACCESS"]
        F -- "Yes" --> H["Context Injection: req.tenant, req.membership"]
    end

    subgraph Layer4["4. Role-Based Access Control (RBAC)"]
        H --> I["requireTenantRole(['owner', 'admin', 'manager'])"]
        I -- "Insufficient Role" --> J["403 Forbidden: INSUFFICIENT_ROLE_PERMISSIONS"]
        I -- "Authorized" --> K["Controller & Business Logic"]
    end

    subgraph Layer5["5. Database Row Level Security (RLS)"]
        K --> L["Supabase PostgreSQL with auth.uid()"]
        L --> M["is_member_of(organization_id)"]
        L --> N["has_org_role(organization_id, allowed_roles)"]
        L --> O["get_customer_id(organization_id)"]
    end

    subgraph Layer6["6. Database Engine Anti-Tamper Triggers"]
        M & N & O --> P["trg_prevent_org_reassign"]
        M & N & O --> Q["trg_prevent_self_role_escalation"]
        M & N & O --> R["trg_prevent_superadmin_escalation"]
        M & N & O --> S["no_update_audit_logs (Append-Only)"]
    end
```

---

## 4. Role Hierarchy & Operational Privileges

OpsPilot establishes a strict separation between **Platform Management** and **Tenant Operations**:

```
Platform Super Admin (user_profiles.is_superadmin = true)
  │ (System oversight across all organizations, billing plans, audit reviews)
  │
  └── Tenant Context (organization_memberships)
        ├── Owner       ── Complete organizational governance, deletion, owner delegation
        ├── Admin       ── User memberships, roles, departments, system configuration
        ├── Manager     ── Dispatching, projects, tasks, expense approvals, inventory
        ├── Employee    ── Task execution, attendance/shifts, submit own expense claims
        └── Customer    ── Service request intake, tracking own tickets, viewing own invoices
```

### Detailed Permission Matrix

| Module / Domain            | Super Admin | Org Owner  |  Org Admin  |  Manager  |   Employee    |      Customer       |
| -------------------------- | :---------: | :--------: | :---------: | :-------: | :-----------: | :-----------------: |
| **Organizations (CRUD)**   |    Full     | CRUD (Own) | Read/Update |   Read    |     Read      | Read (Own Org Name) |
| **User Memberships**       |    Full     |    Full    | Add/Update  |   Read    |     Read      |        None         |
| **Assign 'Owner' Role**    |    Full     |    Yes     |     No      |    No     |      No       |         No          |
| **Self-Role Change**       |   Blocked   |  Blocked   |   Blocked   |  Blocked  |    Blocked    |       Blocked       |
| **Departments**            |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |     **BLOCKED**     |
| **Workforce Directory**    |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |     **BLOCKED**     |
| **Shifts & Attendance**    |    Full     |    Full    |    Full     |  Manage   |  Own Records  |     **BLOCKED**     |
| **Customers / CRM**        |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |  Own Profile Only   |
| **Suppliers**              |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |     **BLOCKED**     |
| **Assets & Machinery**     |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |     **BLOCKED**     |
| **Inventory & Stock**      |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |     **BLOCKED**     |
| **Projects & Milestones**  |    Full     |    Full    |    Full     |  Manage   | Assigned/Org  |     **BLOCKED**     |
| **Tasks & Collaboration**  |    Full     |    Full    |    Full     |  Manage   | Assigned/Org  |     **BLOCKED**     |
| **Service Requests**       |    Full     |    Full    |    Full     |  Manage   |   Read-Only   |  Own Account Only   |
| **Work Orders & Dispatch** |    Full     |    Full    |    Full     |  Manage   | Assigned Tech |  Own Account Only   |
| **Expenses (Submit)**      |    Full     |    Full    |    Full     |   Full    |  Own Claims   |     **BLOCKED**     |
| **Expense Approvals**      |    Full     |    Full    |    Full     |  Approve  |  **BLOCKED**  |     **BLOCKED**     |
| **Invoices & Billing**     |    Full     |    Full    |    Full     | Read-Only |  **BLOCKED**  |  Own Invoices Only  |
| **Payments Ledger**        |    Full     |    Full    |    Full     | Read-Only |  **BLOCKED**  |  Own Payments Only  |
| **Audit Logs**             |    Full     |    Full    |    Full     | Read-Only |  **BLOCKED**  |     **BLOCKED**     |

---

## 5. Row Level Security (RLS) Implementation Details

All policies are codified in version-controlled migration [`database/migrations/012_comprehensive_rls_policies.sql`](file:///c:/Downloads/OpsPilot/database/migrations/012_comprehensive_rls_policies.sql) and mirrored identically in [`supabase/migrations/012_comprehensive_rls_policies.sql`](file:///c:/Downloads/OpsPilot/supabase/migrations/012_comprehensive_rls_policies.sql).

### 5.1 Security Definer Helper Functions

Each helper function executes with elevated privilege to query system catalog tables without triggering recursive RLS loops, protected by strict search path isolation:

```sql
-- 1. Platform Super Admin Verification
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

-- 2. Tenant Active Membership Verification
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_id = org_id AND user_id = auth.uid() AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_member_of(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of(UUID) TO authenticated, service_role;

-- 3. Tenant Role Verification
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_id = org_id
          AND user_id = auth.uid()
          AND status = 'active'
          AND role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.has_org_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, TEXT[]) TO authenticated, service_role;

-- 4. Customer Identity Resolution
CREATE OR REPLACE FUNCTION public.get_customer_id(org_id UUID)
RETURNS UUID AS $$
DECLARE
    cust_id UUID;
BEGIN
    SELECT c.id INTO cust_id
    FROM public.customers c
    WHERE c.organization_id = org_id
      AND (c.user_id = auth.uid() OR c.email = (SELECT email FROM public.user_profiles WHERE id = auth.uid()))
      AND c.deleted_at IS NULL
    LIMIT 1;
    RETURN cust_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_customer_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_id(UUID) TO authenticated, service_role;
```

---

## 6. Database Engine Anti-Tamper & Anti-Escalation Triggers

### 6.1 Prevention of Unauthorized Organization Reassignment

To guarantee that cross-organization resource tampering cannot occur even through malicious SQL injections or administrative error, an immutable trigger is bound `BEFORE UPDATE` across all 24 tenant-isolated tables:

```sql
CREATE OR REPLACE FUNCTION public.prevent_organization_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Cross-Tenant Violation: Reassigning organization_id across tenant boundaries is strictly prohibited.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

### 6.2 Prevention of Self-Role Escalation

To prevent insider threats where a manager or employee updates their membership record to `admin` or `owner`:

```sql
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any user from modifying their own role unless they are platform superadmin
    IF (auth.uid() = OLD.user_id OR auth.uid() = NEW.user_id) AND NEW.role != OLD.role THEN
        IF NOT public.is_superadmin() THEN
            RAISE EXCEPTION 'Privilege Escalation Blocked: Users cannot modify their own organization role.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Block non-owners from promoting anyone to owner or admin
    IF NEW.role IN ('owner', 'admin') AND OLD.role != NEW.role THEN
        IF NOT (public.has_org_role(OLD.organization_id, ARRAY['owner']) OR public.is_superadmin()) THEN
            RAISE EXCEPTION 'Authorization Blocked: Only existing organization owners can grant owner or admin roles.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

### 6.3 Prevention of Super Admin Elevation

To prevent any regular tenant user from elevating their own user profile to superadmin:

```sql
CREATE OR REPLACE FUNCTION public.prevent_superadmin_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_superadmin != OLD.is_superadmin THEN
        IF NOT public.is_superadmin() THEN
            RAISE EXCEPTION 'Privilege Escalation Blocked: Only superadmins can alter is_superadmin status.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

---

## 7. Storage Bucket Multi-Tenant Isolation

Supabase storage objects are partitioned by tenant using the organizational UUID prefix schema:
`/{organization_id}/{bucket_name}/{file_uuid}.{ext}`

Storage RLS policies enforce:

```sql
CREATE POLICY "Tenant Storage Access Policy"
    ON storage.objects FOR ALL
    USING (
        public.is_superadmin() OR
        public.is_member_of((storage.foldername(name))[1]::UUID)
    );
```

---

## 8. Automated Verification & Isolation Test Suite

OpsPilot maintains automated positive and negative test coverage verifying every tier of isolation:

---

## 9. Structured Application Logging & Security Event Auditing

OpsPilot implements structured, contextual logging to ensure complete observability while guaranteeing that sensitive credentials, tokens, and personally identifiable information (PII) are never exposed.

- **Log Formatting:** Formats log entries with ISO 8601 timestamps, log levels (`INFO`, `WARN`, `ERROR`, `DEBUG`), request correlation IDs, and sanitized execution metadata.
- **Dedicated Security Event Tagging (`[SECURITY_EVENT]`):** Critical security events are tagged and indexed separately:
  - `AUTH_LOGIN_SUCCESS`: Successful authentication with actor and tenant context.
  - `AUTH_LOGIN_FAILED`: Failed login attempts and credential anomalies.
  - `AUTH_LOGOUT`: Session terminations and token revocations.
  - `FORBIDDEN_PRIVILEGE_ESCALATION`: Blocked privilege escalation attempts.
  - `FORBIDDEN_CROSS_TENANT_ACCESS`: Intercepted cross-tenant data requests.
  - `RATE_LIMIT_EXCEEDED`: Throttled abusive traffic.

---

## 10. Request Correlation IDs & Distributed Tracing

Every incoming HTTP request is assigned a unique correlation ID to enable distributed tracing across microservices, gateways, reverse proxies, and audit logs.

- **Header Propagation:** The server checks for existing `X-Correlation-Id` or `X-Request-Id` headers. If absent, a cryptographically random UUID is generated (`crypto.randomUUID()`).
- **Response Headers:** Both `X-Correlation-Id` and `X-Request-Id` are echoed in every HTTP response.
- **Envelope Inclusion:** The correlation ID is included in all standard success responses (`meta.requestId`), paginated envelopes, error envelopes, and structured log entries.

---

## 11. Sensitive Data Redaction & Secret Leakage Prevention

The platform employs a recursive redaction engine (`server/src/utils/redact.js`) to sanitize logs, error traces, and audit diffs before output:

- **Redacted Keys:** Any key matching `/password|token|secret|authorization|service_role|apikey|api_key|access_token|refresh_token|credit_card|cvv|ssn/i` is automatically masked with `'[REDACTED]'`.
- **JWT / Bearer Token Masking:** Raw Bearer tokens and JWT strings are detected via regex and masked as `'Bearer [REDACTED_JWT]'`.
- **Circular Reference Safety:** WeakSet tracking prevents infinite recursion on complex cyclic objects.
- **Production Stack Sanitization:** Internal error stack traces are suppressed in production mode to prevent information disclosure.

---

## 12. Production Rate Limiting & DoS Mitigation

To protect against brute-force credential stuffing and denial-of-service attacks, OpsPilot enforces sliding-window rate limiting (`server/src/middleware/rateLimitMiddleware.js`):

- **Default API Limiter:** 300 requests per 15-minute window for standard operational routes.
- **Authentication Limiter:** 30 requests per 15-minute window for `/auth/login`, `/auth/register`, and `/auth/recover-password`.
- **Standard Headers:** Responses include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After`.
- **Abuse Tagging:** Exceeded rate limits trigger a `RATE_LIMIT_EXCEEDED` security event and return HTTP 429 `TOO_MANY_REQUESTS`.

---

## 13. Secure File Upload Architecture & Validation

File upload validation (`server/src/utils/supabaseHelpers.js`) ensures only safe documents enter organization buckets:

- **Bucket Whitelisting:** Uploads are strictly restricted to authorized buckets (`org-assets`, `org-documents`, `customer-attachments`, `project-files`, `work-order-photos`, `invoice-documents`).
- **Dangerous Extension Blocking:** Executable files and script extensions are strictly prohibited (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.phtml`, `.jsp`, `.asp`, `.py`, `.ps1`, `.vbs`, `.jar`, `.scr`).
- **MIME Type Whitelisting:** Permitted MIME types are enforced per bucket (e.g. PDF, PNG, JPEG, DOCX, XLSX).
- **Size Limits:** Strict per-bucket thresholds (5MB for assets, 50MB for documents, 25MB for attachments, 15MB for invoices).
- **Path Traversal Guards:** File names containing directory traversal sequences (`..`, `/`, `\`) are rejected (`INVALID_FILE_NAME`).

---

## 14. Mass Assignment Protection & Immutability Rules

To prevent attackers from overwriting privileged metadata or hijacking records across tenants:

- **Zod Schema Whitelisting:** Request bodies are validated through strict Zod schemas where unrecognized fields are automatically stripped.
- **Repository-Level Field Sanitization:** `BaseRepository.update` automatically strips protected fields (`organization_id`, `id`, `created_at`, `is_superadmin`).
- **Database Trigger Enforcement:** PostgreSQL triggers raise exception `42501` if `organization_id` or `is_superadmin` are targeted in SQL queries.

---

## 15. Centralized Exception & Database Error Handling

All errors are routed through a centralized exception handler (`server/src/middleware/errorMiddleware.js`):

- **Database Error Translation:** Raw PostgreSQL codes are mapped to semantic HTTP status codes:
  - `23505` (Unique Violation) $\rightarrow$ `409 Conflict` (`CONFLICT_DUPLICATE_RECORD`)
  - `23503` (Foreign Key Violation) $\rightarrow$ `400 Bad Request` (`FOREIGN_KEY_VIOLATION`)
  - `42501` (Row Level Security Violation) $\rightarrow$ `403 Forbidden` (`FORBIDDEN_RLS_VIOLATION`)
  - `23514` (Check Constraint Violation) $\rightarrow$ `400 Bad Request`
  - `22P02` (Invalid Data / UUID Syntax) $\rightarrow$ `400 Bad Request`
  - `PGRST116` (Record Not Found) $\rightarrow$ `404 Not Found`
- **Safe Error Envelopes:** Error details are redacted and sanitized; internal database connection strings are never leaked.

---

## 16. Audit Trail Access Restrictions & Immutability

Audit logs provide an enterprise compliance record for all organizational actions:

- **Record Schema:** Every audit entry records `actor` (`user_id`), `organization_id`, `action`, `entity_type`, `entity_id`, `old_values` (redacted), `new_values` (redacted), `ip_address`, `user_agent`, and `created_at`.
- **Role Access Boundaries:** Access to `/api/v1/audit` is strictly restricted to Organization `owner` and `admin` roles (and Platform Super Admins). Managers, employees, and customer accounts receive HTTP 403 `INSUFFICIENT_ROLE_PERMISSIONS`.
- **Cross-Tenant Isolation:** Users can only query audit records belonging to their active organization tenant.
- **Absolute Immutability:**
  - API level: `POST`, `PUT`, `PATCH`, and `DELETE` requests to `/api/v1/audit` are rejected with HTTP 405 `METHOD_NOT_ALLOWED`.
  - Repository level: `auditRepository.update`, `softDelete`, and `deletePermanent` throw `ForbiddenError`.
  - Database level: PostgreSQL rules `no_update_audit_logs` and `no_delete_audit_logs` prevent SQL mutations (`DO INSTEAD NOTHING`).

---

## 17. Automated Security Test Coverage

The continuous security verification suite validates all critical backend controls:

```bash
> opspilot-monorepo@1.0.0 test
✔ PROMPT 16 — Backend Security, Logging & Audit Infrastructure Test Suite (17/17 PASS)
  - 1.1 Redacts password, secret, token, and API key fields from objects (PASS)
  - 1.2 Redacts raw Bearer JWT strings (PASS)
  - 1.3 Handles circular references safely without infinite recursion (PASS)
  - 2.1 Echoes incoming X-Correlation-Id header in response (PASS)
  - 2.2 Generates new UUID when no correlation header is provided (PASS)
  - 3.1 Enforces nosniff, frameguard, HSTS, and removes x-powered-by (PASS)
  - 4.1 Rejects traffic exceeding window threshold with HTTP 429 and headers (PASS)
  - 5.1 Blocks dangerous executable and script file extensions (PASS)
  - 5.2 Blocks directory traversal attempts (PASS)
  - 5.3 Blocks oversized file uploads (PASS)
  - 5.4 Blocks disallowed MIME types (PASS)
  - 6.1 Validates permissible development environment (PASS)
  - 6.2 Fails fast when mock keys are supplied in production environment (PASS)
  - 7.1 Disallows modifying organization_id, id, or is_superadmin via PATCH (PASS)
  - 8.1 Clamps excessive limit parameter to safe maximum of 100 (PASS)
  - 8.2 Coerces negative and zero page numbers to 1 (PASS)
  - 9.1 Organization Owner can read tenant audit logs (HTTP 200) (PASS)
  - 9.2 Manager, Employee, and Customer are FORBIDDEN from reading audit logs (HTTP 403) (PASS)
  - 9.3 Cross-Tenant Isolation: Apex Owner cannot access Acme audit logs (PASS)
  - 9.4 Audit Trail Immutability: Mutating audit logs via API is rejected (HTTP 405) (PASS)
  - 9.5 AuditRepository Immutability: Direct code mutations throw ForbiddenError (PASS)
  - 10.1 Successful login records AUTH_LOGIN_SUCCESS security audit event (PASS)

Total Tests: 203 passing, 0 failures (100% PASS)
Linting: 0 errors, 0 warnings
Prettier: 100% compliant
```
