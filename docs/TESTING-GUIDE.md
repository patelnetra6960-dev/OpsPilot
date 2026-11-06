# OpsPilot Comprehensive Testing Guide

This guide details how to execute, verify, and expand the testing suites in **OpsPilot**. The test architecture encompasses static security audits, database integrity verification, API integration suites, and end-to-end browser automation.

---

## 1. Test Architecture Overview

OpsPilot employs a zero-fluff testing strategy utilizing Node.js's native test runner (`node --test`), Supertest, and Playwright:

```text
tests/
├── unit/                                  # Static schema, RLS, and component contract audits
│   ├── database_integrity_and_rls.test.js # Foreign keys, CHECK constraints, transaction invariants
│   ├── database_schema_and_migrations.test.js # 14 SQL migration files validation & secret checks
│   ├── frontend_qa_and_contracts.test.js  # Form schemas (Zod), RBAC routes, and API contracts
│   └── rbac_direct_db_rls.test.js         # Anti-tampering triggers and direct RLS simulation
├── integration/                           # Supertest API and business logic suites
│   ├── auth_and_rbac.test.js              # Token issuance, privilege escalation guards, logins
│   ├── core_operations.test.js            # Workforce, Projects, Tasks, Inventory, Invoices
│   ├── analytics_bi_reporting.test.js     # KPI aggregations, date filtering, permission views
│   ├── notifications_and_sockets.test.js  # Socket.IO authenticated rooms & deduplication
│   ├── workflow_automation.test.js        # BullMQ jobs, idempotency cooldowns, background alerts
│   ├── security_penetration_and_qa.test.js# IDOR, cross-tenant leaks, rate limits, SQL injection
│   └── performance_and_scalability.test.js# Latency benchmarks, pagination limits, bulk batching
└── e2e/                                   # Playwright browser end-to-end automation
    └── opspilot_lifecycle.spec.js         # Full UI lifecycle, responsive layout, persona routing
```

---

## 2. Master Test Commands

Execute tests using the official npm scripts defined in `package.json`:

| Command | Target Suite | Description | Typical Execution Time |
| :--- | :--- | :--- | :--- |
| `npm test` | **Full Test Battery** | Runs Unit $\rightarrow$ Server $\rightarrow$ Integration $\rightarrow$ E2E suites | ~15 seconds |
| `npm run test:unit` | **Unit & Schema Audits** | Validates SQL migrations, RLS rules, and form schemas | ~1 second |
| `npm run test:server` | **Server Unit Tests** | Executes isolated server module tests | ~1 second |
| `npm run test:integration`| **API & Business Logic** | Supertest integration tests across all modules | ~4 seconds |
| `npm run test:e2e` | **Playwright E2E** | Headless browser execution across 6 lifecycle flows | ~8 seconds |
| `npm run test:smoke` | **Production Smoke Tests**| Live HTTP probes against running server (`http://localhost:5000`) | < 500ms |
| `npm run verify:rls` | **Database RLS Audit** | Verifies 100% of tables have Row Level Security enabled | < 300ms |
| `npm run check:env` | **Environment Audit** | Asserts zero secrets leaked into frontend files | < 200ms |

---

## 3. Step-by-Step Testing Procedures

### A. Authentication & Session Verification
Verifies token creation, signature validation, session refresh, and invalid token rejection.

- **Run Command:**
  ```bash
  node --test tests/integration/auth_and_rbac.test.js
  ```
- **What is Tested:**
  - Login with valid credentials returns a signed JWT and user profile.
  - Password mismatch returns `HTTP 401 Unauthorized`.
  - Malformed or tampered Bearer tokens return `HTTP 401`.
  - Expired tokens return `HTTP 401` with error code `TOKEN_EXPIRED`.
  - Non-existent tenant slug returns `HTTP 404`.

### B. Role-Based Access Control (RBAC) Testing
Verifies that permissions defined in `permissions.js` are strictly enforced by Express route guards.

- **Run Command:**
  ```bash
  node --test tests/integration/auth_and_rbac.test.js
  ```
- **Permission Matrix Coverage:**
  - **Owner (`alex`):** Full access to finance, company settings, and workforce invites.
  - **Admin (`sarah`):** Can manage workforce, projects, and work orders; cannot delete tenant.
  - **Manager (`marcus`):** Can approve expenses and assign tasks; blocked from billing settings (`HTTP 403`).
  - **Employee / Tech (`david`):** Can submit expenses and update assigned work orders; blocked from approving others' expenses (`HTTP 403`).
  - **Customer (`olivia`):** Restricted strictly to `/portal`; blocked from viewing internal workforce, inventory, or projects (`HTTP 403`).

### C. Multi-Tenant Isolation & Cross-Tenant Leak Testing
Asserts that no user or API call can access, mutate, or query data belonging to a different tenant.

- **Run Command:**
  ```bash
  node --test tests/integration/security_penetration_and_qa.test.js
  ```
- **Security Assertions:**
  - **Tenant Header Spoofing:** A user authenticated to Tenant A sending `X-Tenant-Id: <tenant-b-id>` receives `HTTP 403 Forbidden` (`Cross-tenant breach prevented`).
  - **IDOR on Entities:** Querying `GET /api/v1/invoices/:id` for an invoice owned by Tenant B returns `HTTP 404 Not Found` (zero data leakage).
  - **Cross-Tenant Reassignment:** Attempting to update `organization_id` on an existing entity fails immediately via the database anti-tampering trigger `prevent_tenant_reassignment()`.
  - **Customer Boundary:** A customer user cannot query any project or internal workforce member (`HTTP 403`).

### D. API Integration & Business Logic Testing
Validates complete multi-step business transactions across all 10 domain services.

- **Run Command:**
  ```bash
  node --test tests/integration/core_operations.test.js
  ```
- **What is Tested:**
  - **Workforce:** Invite employee, duplicate email rejection, role assignment.
  - **Customers:** Customer registration, SLA tier assignment.
  - **Projects & Tasks:** Project creation, task lifecycle (`todo` $\rightarrow$ `done`), assignee verification.
  - **Service Requests & Work Orders:** Customer ticket submission, manager conversion to work order, technician checklist updates.
  - **Inventory:** Stock adjustments, decrement transactions, negative quantity prevention.
  - **Finance:** Line item calculations, tax computation, expense approvals, invoice payment reconciliation (`balance = total - paid_amount`).

### E. Database Integrity & RLS Verification
Verifies database foreign keys, cascading deletes, CHECK constraints, and PostgreSQL RLS coverage.

- **Run Commands:**
  ```bash
  # 1. Verify schema constraints and invariants:
  node --test tests/unit/database_integrity_and_rls.test.js

  # 2. Verify all 14 SQL migration files:
  node --test tests/unit/database_schema_and_migrations.test.js

  # 3. Static audit of Row Level Security policies across all tables:
  npm run verify:rls
  ```
- **Expected RLS Output:**
  ```text
  Discovered 27 application schema tables in PostgreSQL.
  - Total Tables:             27
  - RLS-Shielded Tables:      27/27 (100.0%)
  ✓ 100% of application tables are protected by PostgreSQL Row Level Security (RLS).
  ✓ Multi-tenant data isolation verified successfully.
  ```

### F. Real-Time Socket.IO & Event Deduplication Testing
Verifies authenticated WebSocket handshakes, room isolation, and sliding-window event deduplication.

- **Run Command:**
  ```bash
  node --test tests/integration/notifications_and_sockets.test.js
  ```
- **What is Tested:**
  - Unauthenticated connections are rejected during handshake (`Authentication error`).
  - Clients are automatically routed to `org:<orgId>` and `user:<userId>`.
  - Cross-organization room joining requests are blocked.
  - Duplicate event IDs within a 60-second window are dropped to prevent duplicate UI toasts.

### G. Background Workflow Automation Testing
Verifies asynchronous background processing, overdue task detection, and notification throttling.

- **Run Command:**
  ```bash
  node --test tests/integration/workflow_automation.test.js
  ```
- **What is Tested:**
  - Overdue task cron sweep identifies past-due tasks and alerts assignees.
  - Low-stock detector identifies items below `reorder_level` and dispatches alerts.
  - Cooldown deduplication ensures duplicate reminder emails are not re-sent within a 24-hour window.
  - Queue recovers gracefully if Redis is offline (falls back to memory queue).

### H. End-to-End Playwright Browser Testing
Executes real browser automation against the frontend React application running on `http://localhost:5173`.

> [!IMPORTANT]
> Ensure the development server is active before running Playwright tests. Either run `npm run dev` in another window or let Playwright use the existing dev server.

- **Run Command:**
  ```bash
  npm run test:e2e
  ```
- **Playwright Test Scenarios Covered:**
  1. **Landing Page:** Renders navigation header, brand logo, feature showcase, and "Get Started" buttons.
  2. **Form Validation:** Submitting empty login form verifies error feedback on email and password fields.
  3. **Owner Persona Login:** 1-Click login as Alex Rivera logs in, establishes session in `localStorage`, and renders the Executive Dashboard.
  4. **Kanban Navigation:** Navigates to Agile Kanban board, verifies columns (*Backlog*, *To Do*, *In Progress*, *Review*, *Done*).
  5. **Financial Invoices:** Navigates to `/invoices`, displays active invoice records, status badges (*Paid*, *Pending*, *Overdue*).
  6. **Customer Portal Boundary:** Logging in as customer Olivia Parker automatically redirects to `/portal`, locking out internal administration routes.

---

## 4. Production Smoke Testing

To test a running OpsPilot deployment (local or remote staging/production):

```bash
# Test local instance:
npm run test:smoke

# Test remote deployment:
node scripts/smoke-test.js https://api.opspilot.example.com
```

**Checks Performed:**
1. Root Load Balancer Probe (`GET /health`) $\rightarrow$ HTTP 200
2. Standard Operational API Health (`GET /api/v1/health`) $\rightarrow$ HTTP 200
3. Container Liveness Probe (`GET /api/v1/health/liveness`) $\rightarrow$ HTTP 200
4. Deep Readiness Probe (`GET /api/v1/health/readiness`) $\rightarrow$ HTTP 200 (database & cache verified)
5. HTTP Security Headers Audit (Helmet `noSniff`, `sameorigin` frameguard)
6. CORS Preflight Configuration (`OPTIONS /api/v1/health`)
7. Protected Route Authentication Guard (`GET /api/v1/projects` without token $\rightarrow$ HTTP 401)
8. Swagger UI Interactive Documentation Reachability (`GET /api/v1/docs/`) $\rightarrow$ HTTP 200
9. Latency Benchmark: 5 consecutive pings measuring min, avg, and max latency.
