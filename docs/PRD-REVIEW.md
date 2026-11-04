# OpsPilot — PRD Comprehensive Review & Gap Analysis

**Document Status:** Ready for Review & Approval  
**Reviewed Document:** [docs/PRD.md](file:///c:/Downloads/OpsPilot/docs/PRD.md) (v1.0.0)  
**Reviewer:** Independent Senior Product Manager & Enterprise Software Architect  
**Review Date:** November 4, 2026  
**Target Delivery Window Evaluated:** 8–12 Weeks (Solo Developer / Rapid Delivery)

---

## 1. Executive Summary & Review Scorecard

The initial Product Requirements Document (PRD) provides a strong foundational vision for **OpsPilot**, establishing the core value proposition of dual-tier multi-tenant isolation, modular monolith design, and field operations management.

However, an independent architectural and product audit reveals **critical specification gaps, schema contradictions, missing business workflows, and feasibility friction points** that must be resolved before proceeding further into development.

### Review Scorecard

| Criteria Domain                      | Rating (1–5) |     Status      | Key Observation                                                                                   |
| ------------------------------------ | :----------: | :-------------: | ------------------------------------------------------------------------------------------------- |
| **1. Vision & Business Objectives**  |   4.5 / 5    |    ✅ Strong    | Clear positioning; needs quantifiable compliance and retention metrics.                           |
| **2. Real-World Business Problems**  |   4.0 / 5    |   ⚠️ Moderate   | Core pain points covered; missing customer invoicing and offline sync rules.                      |
| **3. Target Customers & Personas**   |   4.0 / 5    |   ⚠️ Moderate   | 5 personas defined; missing customer onboarding journey.                                          |
| **4. Five User Roles Alignment**     |   3.0 / 5    | ❌ Critical Gap | **Major contradiction:** `Customer` role is defined in PRD but omitted from DB schema constraint. |
| **5. Functional Requirements**       |   3.5 / 5    |   ⚠️ Moderate   | Core modules defined; lacks break compliance, asset lockouts, and dispute flows.                  |
| **6. Non-Functional Requirements**   |   4.0 / 5    |    ✅ Strong    | Solid latency/security targets; lacks RPO/RTO and connection pooling limits.                      |
| **7. User Journeys**                 |   3.5 / 5    |   ⚠️ Moderate   | Happy paths covered; missing staff invitation and shift call-out journeys.                        |
| **8. Business Workflows**            |   3.0 / 5    |     ❌ Gap      | Missing user invitation, timesheet dispute, and asset checkout workflows.                         |
| **9. Permissions Matrix**            |   3.5 / 5    |   ⚠️ Moderate   | High-level matrix exists; lacks granular resource-level ownership distinctions.                   |
| **10. Validation Rules**             |   4.0 / 5    |     ✅ Good     | Shift and org rules present; lacks coordinate bounds and phone formatting.                        |
| **11. Error Handling & Edge Cases**  |   4.0 / 5    |     ✅ Good     | Concurrency and network drops addressed; missing timezone DST transitions.                        |
| **12. Multi-Tenant Requirements**    |   4.5 / 5    |    ✅ Strong    | Dual-tier isolation strategy is well-articulated.                                                 |
| **13. Security Requirements**        |   4.0 / 5    |   ⚠️ Moderate   | Zero service-role leakage enforced; needs rate-limiting and CSRF specifications.                  |
| **14. Database Requirements**        |   3.0 / 5    |     ❌ Gap      | Lacks soft delete (`deleted_at`) strategy, pagination standard, and cascade rules.                |
| **15. MVP Scope & Solo Feasibility** |   3.5 / 5    |   ⚠️ Moderate   | Background GPS tracking and heavy PDF generators are too heavy for solo timeline.                 |
| **16. Acceptance Criteria**          |   2.5 / 5    | ❌ Critical Gap | Only 5 scenarios defined; Assets, Documents, Customer Portal, and Audit have **zero** criteria.   |

---

## 2. In-Depth Analysis Against the 16 Review Criteria

### Criterion 1: Product Vision and Business Objectives

- **Strengths:** Clear positioning against bloated legacy enterprise platforms; strong focus on multi-tenancy and audit compliance.
- **Gaps:** Lacks measurable compliance standards (e.g., SOC2 Type II readiness, GDPR "Right to be Forgotten", OSHA/labor record retention minimum of 3 to 7 years).
- **Impact:** Without data retention rules, database storage requirements cannot be forecasted.

### Criterion 2: Real-World Business Problems

- **Strengths:** Addresses ghost hours, paper dispatching, and cross-tenant leakage.
- **Gaps:** Does not detail how invoice amounts are calculated from hourly rates and parts, or how operators handle client disputes over invoice line items.
- **Impact:** High risk of scope creep when connecting work orders to billable customer receipts.

### Criterion 3: Target Customers and User Personas

- **Strengths:** 5 distinct personas with clear pain points across VP, Dispatcher, Field Tech, Customer, and Super Admin.
- **Gaps:** Customer persona (Claire) is described as an external client, but the PRD does not specify whether customer organizations can have multiple users (e.g. Property Manager + Accounts Payable clerk) or how customer accounts are provisioned.

### Criterion 4: All Five User Roles Alignment

- **Critical Finding:** The PRD specifies 5 roles: `Super Admin`, `Organization Admin`, `Manager`, `Employee`, and `Customer`.
  - **Database Contradiction:** In the database migration `001_initial_multitenant_schema.sql`, the check constraint strictly enforces:
    ```sql
    CHECK (role IN ('owner', 'admin', 'manager', 'member'))
    ```
  - `Customer` does NOT exist in the database enum/check constraint!
  - `Super Admin` is modeled as a boolean `is_superadmin` on `users_profiles`, whereas other roles are strings on `organization_members`.
- **Impact:** The application will fail database check constraints when attempting to assign a `customer` role or onboard a customer user.

### Criterion 5: Complete Functional Requirements

- **Module 1 (Identity & Tenancy):** Missing password reset flow, email change verification, and self-service organization deletion.
- **Module 3 (Workforce):** Missing employee offboarding/termination logic. When a worker is terminated, what happens to upcoming shifts and active work orders?
- **Module 4 (Scheduling & Timekeeping):** Missing paid vs. unpaid meal break tracking, overtime calculation logic (daily >8 hrs vs. weekly >40 hrs), and multi-timezone shift display.
- **Module 6 (Assets):** Missing prevention logic: dispatching an asset that is currently marked `maintenance` or `retired`.
- **Module 7 (Documents):** Missing tenant storage quota limits (e.g. 5GB on Starter, 50GB on Enterprise) and antivirus/malware file validation.
- **Module 8 (Customer Portal):** Missing customer magic-link authentication and dispute ticketing.
- **Module 9 (Audit & Analytics):** Missing audit log retention policy (90 days vs. 365 days) and query performance safeguards for large logs.

### Criterion 6: Non-Functional Requirements

- **Strengths:** Excellent API latency targets ($p95 < 200\text{ ms}$), client bundle size guidelines ($< 500\text{ KB}$), and security headers.
- **Gaps:** Lacks Disaster Recovery benchmarks:
  - **RPO (Recovery Point Objective):** Target $< 1\text{ hour}$.
  - **RTO (Recovery Time Objective):** Target $< 4\text{ hours}$.
  - Missing database connection pool sizing (Supabase transaction pooler limit recommendations for Express).

### Criterion 7: User Journeys

- **Strengths:** Covers Admin onboarding, Manager dispatch, Tech mobile execution, and Customer sign-off.
- **Gaps:** Missing user journeys for:
  1. _Employee Invitation & Activation:_ Email invitation $\to$ temporary token $\to$ set password $\to$ profile completion.
  2. _Shift Call-Out & Emergency Reassignment:_ Worker calls out sick 45 minutes before shift $\to$ Manager alerted $\to$ 1-click broadcast/reassignment.
  3. _Tenant Offboarding & Data Export:_ Admin requests account termination and downloads ZIP archive of compliance logs and receipts.

### Criterion 8: Business Workflows & State Machines

- **Strengths:** Work order state machine and time attendance sequence diagrams are well-structured.
- **Gaps:** Missing state machines and sequence diagrams for:
  1. _Member Invitation Lifecycle:_ `INVITED` $\to$ `ACTIVE` $\to$ `SUSPENDED` $\to$ `REVOKED`.
  2. _Asset Allocation Lifecycle:_ `AVAILABLE` $\to$ `CHECKED_OUT` $\to$ `IN_FIELD` $\to$ `INSPECTION` $\to$ `MAINTENANCE`.
  3. _Timesheet Discrepancy & Dispute Workflow:_ When GPS check-in occurs $> 500\text{m}$ away or manager edits recorded hours.

### Criterion 9: Permissions Matrix

- **Strengths:** High-level 16-action table across 5 roles.
- **Gaps:** Lacks field-level / resource-ownership granularity:
  - Can an Employee edit their own phone number or home address?
  - Can a Manager see other Managers' shift assignments?
  - Can a Customer see the full name and phone number of the technician, or only first name and vehicle ID?

### Criterion 10: Input Validation Rules

- **Strengths:** Covers slug format, employee code format, chronological shift bounds.
- **Gaps:** Missing geographic coordinate validation ($\text{lat} \in [-90, 90]$, $\text{lng} \in [-180, 180]$), geofence radius boundaries ($20\text{m} \le r \le 5000\text{m}$), and international phone number validation (E.164).

### Criterion 11: Error Handling and Edge Cases

- **Strengths:** Good coverage of offline queuing, header tampering, and concurrent edits.
- **Gaps:**
  - Daylight Saving Time (DST) transitions: A 12-hour overnight shift spanning 02:00 AM clock change can mistakenly record 11 or 13 hours if calculated naively using local timestamps instead of UTC epoch math.
  - Rapid double-tap clock-in resulting in duplicate attendance records.

### Criterion 12: Multi-Tenant Requirements

- **Strengths:** Dual-tier architecture (Express middleware + PostgreSQL RLS) is state-of-the-art.
- **Gaps:** Does not specify tenant branding isolation: can each tenant upload their own logo to display on customer receipts and emails?

### Criterion 13: Security Requirements

- **Strengths:** Zero service-role exposure, parameterized queries, RLS policies.
- **Gaps:**
  - Rate-limiting is mentioned generally but not quantified (e.g., 5 failed login attempts per IP per 15 minutes to block brute-force attacks; 100 API requests per minute per user).
  - Storage upload MIME-type sniffing: validating magic bytes on file upload, not just client-supplied extension.

### Criterion 14: Database-Related Requirements

- **Critical Finding:** Soft deletes vs. Hard deletes:
  - If a user or employee is deleted via `ON DELETE CASCADE`, all their historical shift logs, work order records, and audit logs risk being destroyed or corrupted.
  - System must mandate **Soft Deletion** (`deleted_at TIMESTAMPTZ NULL`) for `workforce_members`, `organizations`, `assets`, and `work_orders`.
  - Pagination standard: PRD omits standard pagination limits (e.g. default 20, max 100 items per page with cursor/offset) for workforce and audit tables.

### Criterion 15: MVP Scope and Solo Developer Feasibility

- **Solo Developer Reality Check:**
  - _Unrealistic Feature 1:_ Continuous GPS background breadcrumb tracking requires native iOS/Android background location services and high battery drain; in a mobile web app, this fails when Safari/Chrome is backgrounded.
    - _Recommendation:_ Scope to **Point-in-Time Geofence Check** upon Clock-In and Clock-Out button click only.
  - _Unrealistic Feature 2:_ Server-side headless browser PDF rendering (Puppeteer/Playwright) is resource-heavy and complex to deploy.
    - _Recommendation:_ Use lightweight client-side `window.print()` stylesheets or `pdf-lib` for work order receipts.

### Criterion 16: Acceptance Criteria Completeness

- **Critical Finding:** Section 14 only provides acceptance criteria for 5 scenarios (Onboarding, Workforce add, Shift conflict, Geofenced clock-in, Work order complete).
- **Missing Acceptance Criteria:**
  - Module 2: Member invitation acceptance & role revocation.
  - Module 6: Asset checkout conflict (assigning equipment already in use).
  - Module 7: Document upload with size limit rejection & signed URL expiration.
  - Module 8: Customer submitting ticket & approving completion.
  - Module 9: Tamper-proof audit log generation and CSV export filtering.

---

## 3. Comprehensive Defect & Gap Catalog

The table below catalogs every identified finding, why it matters, what must be added, and the affected module.

| Defect ID  | Finding & Classification                                                    | Why It Matters                                                                                                                                     | Required Addition / Remediation                                                                                                          | Affected Module                         |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **GAP-01** | **Customer Role Missing in DB Constraint** _(Contradiction)_                | In `001_initial_multitenant_schema.sql`, role check is `('owner', 'admin', 'manager', 'member')`. Inserting a customer throws DB constraint error. | Expand DB enum to `('owner', 'admin', 'manager', 'employee', 'customer')` or establish a distinct `customer_accounts` table.             | Module 1 & Module 2                     |
| **GAP-02** | **Continuous GPS vs. Point-in-Time Tracking** _(Unrealistic for Solo)_      | Continuous GPS breadcrumb tracking fails in mobile web browsers when backgrounded and consumes massive DB writes.                                  | Explicitly scope MVP to **Point-in-Time Geolocation Verification** captured solely upon tap of Clock-In, Clock-Out, and Job Arrival.     | Module 4 (Scheduling & Attendance)      |
| **GAP-03** | **Missing Soft Delete Architecture** _(Database Risk)_                      | Hard deletes (`ON DELETE CASCADE`) would destroy historical work order proof, payroll history, and audit compliance trails.                        | Add `deleted_at TIMESTAMPTZ DEFAULT NULL` to all core tables; update RLS policies to check `deleted_at IS NULL`.                         | Database Schema & All Modules           |
| **GAP-04** | **Missing Employee Offboarding / Suspension Workflow** _(Missing Workflow)_ | Deactivating an employee leaves their future assigned shifts and in-progress work orders in an unmanaged orphan state.                             | Define cascade suspension rule: automatically unassign future shifts and alert Dispatcher to reassign open work orders.                  | Module 3 & Module 5                     |
| **GAP-05** | **Absence of Break Time & Overtime Rules** _(Compliance Gap)_               | Labor laws mandate meal/rest breaks and overtime calculation (>40 hrs/wk or >8 hrs/day). Without this, timesheet exports fail payroll compliance.  | Add `break_duration_minutes` to attendance records and configure overtime calculation rules in Organization Settings.                    | Module 4 (Attendance)                   |
| **GAP-06** | **Asset Conflict Prevention Rule Missing** _(Operational Gap)_              | Two dispatchers can assign the same truck or specialized tool to different work orders at the same time.                                           | Implement asset availability check preventing assignment if asset status $\ne$ `'available'` or if schedule overlaps.                    | Module 6 (Asset Registry)               |
| **GAP-07** | **Customer Self-Service Onboarding Undefined** _(Missing Journey)_          | PRD doesn't define how Claire (Customer) gets access. Can anyone register? How is a customer bound to a tenant?                                    | Specify customer invitation flow: Org Admin/Manager creates Customer Account with contact email; customer receives sign-in magic link.   | Module 8 (Customer Portal)              |
| **GAP-08** | **Document Storage Quotas & Security** _(Security & Cost Gap)_              | No file size caps or bucket quota per tenant allows malicious or runaway file uploads to exhaust Supabase storage.                                 | Enforce per-tenant storage quotas (Starter: 5GB, Growth: 25GB, Enterprise: 100GB) and client/server magic-byte file validation.          | Module 7 (Document Vault)               |
| **GAP-09** | **Daylight Saving Time (DST) Shift Calculation Bug** _(Edge Case)_          | Calculating shift hours using local time math causes 1-hour errors during autumn/spring clock changes.                                             | Mandate all shift and attendance timestamps stored and calculated strictly in UTC (`TIMESTAMPTZ` with epoch arithmetic).                 | Module 4 (Scheduling & Timekeeping)     |
| **GAP-10** | **Rate Limiting & Brute Force Protection Undefined** _(Security Gap)_       | Login and dispatch endpoints vulnerable to credential stuffing and denial-of-service without explicit rate limits.                                 | Specify rate limits: 5 failed logins per IP/15min (`express-rate-limit`); 120 API requests/minute per authenticated user.                | Non-Functional Requirements             |
| **GAP-11** | **Missing Pagination Standards** _(Performance Risk)_                       | Large organizations with 500 workers will crash browser and server if fetching all workforce/audit records at once.                                | Mandate standardized cursor/offset pagination (`page=1`, `limit=25`, max 100) on all directory, shift, and audit endpoints.              | API Design & Backend Architecture       |
| **GAP-12** | **Incomplete Acceptance Criteria** _(Quality & QA Gap)_                     | Modules 6, 7, 8, and 9 have zero Given-When-Then acceptance criteria, preventing reliable test case design.                                        | Add formal Given-When-Then criteria for Asset Checkout, Document Upload, Customer Ticket Lifecycle, and Audit CSV Export.                | Section 14 (Acceptance Criteria)        |
| **GAP-13** | **Disaster Recovery (RTO / RPO) Missing** _(Enterprise SLA Gap)_            | Enterprise clients require explicit Disaster Recovery SLAs before onboarding commercial operations data.                                           | Formulate RTO ($< 4\text{ hours}$) and RPO ($< 1\text{ hour}$) using Supabase automated daily backups and point-in-time recovery (PITR). | Section 7 (Non-Functional Requirements) |
| **GAP-14** | **Tenant Branding & White-Label Isolation** _(Feature Ambiguity)_           | Customers logging into the portal expect Elena's branding, not generic OpsPilot text.                                                              | Add `logo_url`, `primary_color`, and `contact_support_email` to `organizations.settings` JSONB schema.                                   | Module 1 & Module 8                     |

---

## 4. Specific Defect Deep-Dive

### 4.1 Defect Deep-Dive: Role Hierarchy & Database Alignment (GAP-01)

- **Problem:** In Section 5 of `PRD.md`, 5 user roles are defined:
  1. `Super Admin`
  2. `Organization Admin`
  3. `Manager`
  4. `Employee`
  5. `Customer`
- **Root Cause in Codebase:** In `supabase/migrations/001_initial_multitenant_schema.sql` (Line 42), the membership table defines:
  ```sql
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member'))
  ```
  Notice: `employee` is mapped as `'member'`, but `'customer'` is completely absent. Furthermore, Super Admin is modeled as `is_superadmin BOOLEAN` on `users_profiles`, creating an architectural disconnect between system-level operators and tenant-level actors.
- **Architectural Fix Required:**
  1. Standardize role taxonomy across documentation and code:
     - **System Role:** `is_superadmin` on `users_profiles` (Platform level).
     - **Tenant Role:** `role IN ('owner', 'admin', 'manager', 'employee', 'customer')` on `organization_members`.
  2. For external customers, evaluate whether a dedicated `customers` table with linked `customer_users` provides cleaner data isolation than blending client contacts into the internal workforce table.

### 4.2 Defect Deep-Dive: Solo Developer Feasibility on Mobile GPS & PDFs (GAP-02)

- **Problem:** The PRD currently implies real-time background GPS tracking of technicians and heavy server-side PDF generation.
- **Feasibility Reality:**
  - Mobile web browsers (Safari on iOS, Chrome on Android) intentionally throttle or terminate background geolocation tracking to prevent battery drain. Implementing continuous tracking in a web application without a native iOS/Android wrapper (Capacitor/React Native) will lead to broken promises and frustrated technicians.
  - Headless Chromium server-side PDF generation (Puppeteer) adds 300MB+ to backend container sizes and frequently crashes under low-memory instances.
- **Architectural Fix Required:**
  1. Scope MVP attendance tracking strictly to **Point-in-Time Geofence Capture**: when the technician presses "Clock In", "Arrived on Site", or "Clock Out", the browser requests a single high-accuracy GPS fix via HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`).
  2. For Work Order Completion Receipts, generate printable HTML/CSS views with `@media print` styling, and provide lightweight client-side PDF export via `pdf-lib` or HTML-to-canvas rendering.

---

## 5. Actionable Remediation Plan & PRD Update Checklist

To transition the PRD from initial draft to an airtight, implementation-ready engineering contract, the following updates must be made to `docs/PRD.md`:

- [ ] **Action 1 (Roles & DB Schema):** Update role check constraint and permissions matrix to explicitly harmonize `owner`, `admin`, `manager`, `employee`, and `customer`.
- [ ] **Action 2 (Scope Clarification):** Explicitly refine Geofence Timekeeping to "Point-in-Time Geolocation on Button Tap" (eliminating continuous background tracking from MVP scope).
- [ ] **Action 3 (Database Architecture):** Add soft-deletion (`deleted_at`) requirement and cursor-based pagination standards.
- [ ] **Action 4 (Missing Workflows):** Add sequence diagrams and step-by-step logic for:
  - User Invitation & Password Setup Lifecycle.
  - Employee Offboarding & Shift/Job Reassignment Cascade.
  - Asset Checkout & Conflict Prevention.
  - Timesheet Overtime & Break Calculation.
- [ ] **Action 5 (Security Specifications):** Add explicit rate-limiting thresholds (auth and API), storage bucket quotas, and file magic-byte validation.
- [ ] **Action 6 (Acceptance Criteria):** Complete formal Given-When-Then acceptance criteria for Modules 6 (Assets), 7 (Documents), 8 (Customer Portal), and 9 (Audit Logging).
- [ ] **Action 7 (NFR Benchmarks):** Add Disaster Recovery targets (RTO $< 4\text{h}$, RPO $< 1\text{h}$) and multi-timezone UTC epoch calculation rules.

---

## 6. Review Conclusion & Approval Gate

The initial PRD is a high-caliber document that accurately captures the business vision, enterprise value proposition, and technical architecture of OpsPilot.

By addressing the **14 cataloged gaps**—specifically harmonizing the customer role in the database, scoping mobile geolocation to realistic point-in-time triggers, adding soft deletes, and completing the missing acceptance criteria—the PRD will become an ironclad, production-grade specification that a solo engineer can execute with confidence within 2–3 months.

> [!IMPORTANT]
> **Approval Gate Status:** Awaiting User Instruction.
>
> - As requested, no changes have been made to `docs/PRD.md` yet.
> - Once you review and approve these findings, I will incorporate all remediations directly into `docs/PRD.md`.
