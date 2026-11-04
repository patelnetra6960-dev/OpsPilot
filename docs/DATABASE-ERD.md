# OpsPilot — Complete Relational Database Entity-Relationship Diagram (ERD)

This document provides the complete, normalized PostgreSQL Entity-Relationship (ER) specification for **OpsPilot** across all 27 core domain entities.

---

## 1. Normalization & Relational Architecture

The OpsPilot schema is engineered to **Third Normal Form (3NF)**:

- **First Normal Form (1NF):** Every attribute contains atomic values. All repeating groups and multi-value sets are decoupled into dedicated junction tables (`role_permissions`, `project_members`, `task_assignments`, `invoice_items`).
- **Second Normal Form (2NF):** Every non-key column is fully functionally dependent on the entire composite primary key.
- **Third Normal Form (3NF):** No transitive dependencies exist. Attributes that depend on another non-key attribute (e.g., customer details inside an invoice, or supplier details inside inventory) are normalized into their respective parent tables (`customers`, `suppliers`) and referenced via foreign keys.
- **Multi-Tenant Ownership:** Every tenant-scoped entity contains an immutable `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`.

---

## 2. Complete Entity-Relationship Diagram

```mermaid
erDiagram
    %% ==========================================
    %% 1. Identity, Tenants & RBAC
    %% ==========================================
    ORGANIZATIONS ||--o{ USER_PROFILES : "provisions"
    ORGANIZATIONS ||--o{ ROLES : "defines"
    ROLES ||--o{ ROLE_PERMISSIONS : "contains"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "grants"
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERSHIPS : "contains"
    USER_PROFILES ||--o{ ORGANIZATION_MEMBERSHIPS : "participates_as"
    ROLES ||--o{ ORGANIZATION_MEMBERSHIPS : "assigns"

    %% ==========================================
    %% 2. Departments & Workforce
    %% ==========================================
    ORGANIZATIONS ||--o{ DEPARTMENTS : "divides_into"
    USER_PROFILES ||--o{ DEPARTMENTS : "manages"
    ORGANIZATIONS ||--o{ WORKFORCE_MEMBERS : "employs"
    USER_PROFILES ||--o{ WORKFORCE_MEMBERS : "links_to"
    DEPARTMENTS ||--o{ WORKFORCE_MEMBERS : "houses"
    WORKFORCE_MEMBERS ||--o{ SHIFT_SCHEDULES : "assigned_to"
    WORKFORCE_MEMBERS ||--o{ ATTENDANCE_RECORDS : "records"
    SHIFT_SCHEDULES ||--o{ ATTENDANCE_RECORDS : "tracks"

    %% ==========================================
    %% 3. CRM & Supply Chain
    %% ==========================================
    ORGANIZATIONS ||--o{ CUSTOMERS : "serves"
    ORGANIZATIONS ||--o{ SUPPLIERS : "procures_from"

    %% ==========================================
    %% 4. Assets & Inventory
    %% ==========================================
    ORGANIZATIONS ||--o{ ASSETS : "tracks"
    WORKFORCE_MEMBERS ||--o{ ASSETS : "operates"
    SUPPLIERS ||--o{ ASSETS : "supplies"
    ORGANIZATIONS ||--o{ INVENTORY_ITEMS : "stocks"
    SUPPLIERS ||--o{ INVENTORY_ITEMS : "provides"
    INVENTORY_ITEMS ||--o{ STOCK_TRANSACTIONS : "adjusts"

    %% ==========================================
    %% 5. Projects & Field Operations
    %% ==========================================
    ORGANIZATIONS ||--o{ PROJECTS : "executes"
    CUSTOMERS ||--o{ PROJECTS : "commissions"
    WORKFORCE_MEMBERS ||--o{ PROJECTS : "leads"
    PROJECTS ||--o{ PROJECT_MEMBERS : "assigns"
    WORKFORCE_MEMBERS ||--o{ PROJECT_MEMBERS : "participates_in"
    PROJECTS ||--o{ PROJECT_MILESTONES : "schedules"

    %% ==========================================
    %% 6. Service Requests & Work Orders
    %% ==========================================
    ORGANIZATIONS ||--o{ SERVICE_REQUESTS : "triages"
    CUSTOMERS ||--o{ SERVICE_REQUESTS : "submits"
    ORGANIZATIONS ||--o{ WORK_ORDERS : "dispatches"
    CUSTOMERS ||--o{ WORK_ORDERS : "bills_to"
    SERVICE_REQUESTS ||--o{ WORK_ORDERS : "converts_to"
    WORKFORCE_MEMBERS ||--o{ WORK_ORDERS : "executes"
    ASSETS ||--o{ WORK_ORDERS : "allocated_to"
    WORK_ORDERS ||--o{ WORK_ORDER_CHECKLISTS : "mandates"
    WORK_ORDERS ||--o{ STOCK_TRANSACTIONS : "consumes"

    %% ==========================================
    %% 7. Tasks & Collaboration
    %% ==========================================
    ORGANIZATIONS ||--o{ TASKS : "manages"
    PROJECTS ||--o{ TASKS : "contains"
    WORK_ORDERS ||--o{ TASKS : "generates"
    WORKFORCE_MEMBERS ||--o{ TASKS : "assigned_task"
    TASKS ||--o{ TASK_ASSIGNMENTS : "assigns_multiple"
    WORKFORCE_MEMBERS ||--o{ TASK_ASSIGNMENTS : "receives"
    TASKS ||--o{ TASK_COMMENTS : "discusses"
    USER_PROFILES ||--o{ TASK_COMMENTS : "writes"
    TASKS ||--o{ TASK_ATTACHMENTS : "includes"
    USER_PROFILES ||--o{ TASK_ATTACHMENTS : "uploads"

    %% ==========================================
    %% 8. Financials: Expenses, Invoices & Payments
    %% ==========================================
    ORGANIZATIONS ||--o{ EXPENSES : "incurs"
    WORKFORCE_MEMBERS ||--o{ EXPENSES : "claims"
    WORK_ORDERS ||--o{ EXPENSES : "costs"
    EXPENSES ||--o{ EXPENSE_APPROVALS : "audits"
    USER_PROFILES ||--o{ EXPENSE_APPROVALS : "approves"

    ORGANIZATIONS ||--o{ INVOICES : "issues"
    CUSTOMERS ||--o{ INVOICES : "receives"
    WORK_ORDERS ||--o{ INVOICES : "bills"
    INVOICES ||--o{ INVOICE_ITEMS : "details"
    INVENTORY_ITEMS ||--o{ INVOICE_ITEMS : "billed_as_part"
    INVOICES ||--o{ PAYMENTS : "reconciles"

    %% ==========================================
    %% 9. Communications & Audit
    %% ==========================================
    ORGANIZATIONS ||--o{ NOTIFICATIONS : "dispatches"
    USER_PROFILES ||--o{ NOTIFICATIONS : "receives"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "records"
    USER_PROFILES ||--o{ AUDIT_LOGS : "triggers"

    %% ==========================================
    %% Entity Definitions with Attributes
    %% ==========================================

    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        string subscription_tier
        boolean is_active
        jsonb settings
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    USER_PROFILES {
        uuid id PK "Matches auth.users(id)"
        string email UK
        string full_name
        text avatar_url
        string phone
        boolean is_superadmin
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    ROLES {
        uuid id PK
        uuid organization_id FK
        string name
        string slug
        text description
        boolean is_system
        timestamptz created_at
        timestamptz updated_at
    }

    PERMISSIONS {
        uuid id PK
        string name UK
        string module
        text description
        timestamptz created_at
    }

    ROLE_PERMISSIONS {
        uuid id PK
        uuid role_id FK
        uuid permission_id FK
        timestamptz created_at
    }

    ORGANIZATION_MEMBERSHIPS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        uuid role_id FK
        string role
        string status
        uuid invited_by FK
        timestamptz joined_at
        timestamptz created_at
        timestamptz updated_at
    }

    DEPARTMENTS {
        uuid id PK
        uuid organization_id FK
        string name
        string code
        text description
        uuid manager_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    WORKFORCE_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        uuid department_id FK
        string employee_code UK_per_tenant
        string first_name
        string last_name
        string email
        string phone
        string designation
        string employment_type
        string status
        numeric hourly_rate
        text_array skills
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    CUSTOMERS {
        uuid id PK
        uuid organization_id FK
        string name
        string contact_person
        string email
        string phone
        text address
        string sla_tier
        string status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    SUPPLIERS {
        uuid id PK
        uuid organization_id FK
        string name
        string code UK_per_tenant
        string contact_name
        string email
        string phone
        text address
        string payment_terms
        string status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    ASSETS {
        uuid id PK
        uuid organization_id FK
        string asset_tag UK_per_tenant
        string name
        string category
        string status
        uuid assigned_to FK
        uuid supplier_id FK
        string serial_number
        date purchase_date
        numeric purchase_cost
        date last_service_date
        date next_service_date
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    INVENTORY_ITEMS {
        uuid id PK
        uuid organization_id FK
        string sku UK_per_tenant
        string name
        string category
        uuid supplier_id FK
        string location
        integer in_stock
        integer reorder_level
        numeric unit_cost
        string status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    STOCK_TRANSACTIONS {
        uuid id PK
        uuid organization_id FK
        uuid inventory_item_id FK
        string transaction_type
        integer quantity
        numeric unit_price
        uuid work_order_id FK
        uuid performed_by FK
        text reference_note
        timestamptz created_at
    }

    PROJECTS {
        uuid id PK
        uuid organization_id FK
        uuid customer_id FK
        string project_code UK_per_tenant
        string name
        text description
        string status
        string health
        integer progress
        numeric budget
        numeric spent
        date start_date
        date target_date
        uuid lead_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    PROJECT_MEMBERS {
        uuid id PK
        uuid organization_id FK
        uuid project_id FK
        uuid workforce_member_id FK
        string project_role
        timestamptz assigned_at
    }

    SERVICE_REQUESTS {
        uuid id PK
        uuid organization_id FK
        uuid customer_id FK
        string request_code UK_per_tenant
        string title
        text description
        string location
        string urgency
        string status
        numeric estimated_cost
        uuid converted_work_order_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    WORK_ORDERS {
        uuid id PK
        uuid organization_id FK
        string work_order_code UK_per_tenant
        string title
        uuid customer_id FK
        uuid service_request_id FK
        uuid assigned_to FK
        uuid asset_id FK
        string site
        string priority
        string status
        timestamptz scheduled_start
        timestamptz scheduled_end
        numeric cost_estimate
        integer progress
        text customer_signature_url
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    TASKS {
        uuid id PK
        uuid organization_id FK
        string task_code UK_per_tenant
        string title
        text description
        string category
        string priority
        string column_name
        uuid assigned_to FK
        uuid project_id FK
        uuid work_order_id FK
        date due_date
        uuid created_by FK
        integer checklist_total
        integer checklist_completed
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    TASK_ASSIGNMENTS {
        uuid id PK
        uuid organization_id FK
        uuid task_id FK
        uuid workforce_member_id FK
        timestamptz assigned_at
    }

    TASK_COMMENTS {
        uuid id PK
        uuid organization_id FK
        uuid task_id FK
        uuid user_id FK
        text comment_text
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_ATTACHMENTS {
        uuid id PK
        uuid organization_id FK
        uuid task_id FK
        string file_name
        text file_url
        integer file_size
        string mime_type
        uuid uploaded_by FK
        timestamptz created_at
    }

    EXPENSES {
        uuid id PK
        uuid organization_id FK
        string claim_code UK_per_tenant
        uuid workforce_member_id FK
        uuid work_order_id FK
        date claim_date
        string category
        text description
        numeric amount
        text receipt_url
        boolean receipt_attached
        string status
        uuid reviewed_by FK
        timestamptz reviewed_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    EXPENSE_APPROVALS {
        uuid id PK
        uuid organization_id FK
        uuid expense_id FK
        uuid approver_id FK
        string decision
        text notes
        timestamptz decided_at
    }

    INVOICES {
        uuid id PK
        uuid organization_id FK
        string invoice_number UK_per_tenant
        uuid customer_id FK
        uuid work_order_id FK
        date issue_date
        date due_date
        numeric subtotal
        numeric tax
        numeric total
        string status
        timestamptz paid_at
        text notes
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid organization_id FK
        uuid invoice_id FK
        uuid inventory_item_id FK
        string description
        numeric quantity
        numeric unit_price
        numeric total_price
        timestamptz created_at
    }

    PAYMENTS {
        uuid id PK
        uuid organization_id FK
        uuid invoice_id FK
        string payment_reference UK_per_tenant
        numeric amount
        string payment_method
        string status
        timestamptz paid_at
        uuid recorded_by FK
        text notes
    }

    NOTIFICATIONS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string title
        text message
        string type
        text action_url
        boolean is_read
        timestamptz read_at
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        string action
        string entity_type
        string entity_id
        jsonb old_values
        jsonb new_values
        string ip_address
        string user_agent
        timestamptz created_at
    }
```

---

## 3. Domain Groupings & Relational Dictionary

### Group 1: Identity, Multi-Tenancy & RBAC

| Entity                     | Purpose                                              | Key Relationships                                                                           |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `organizations`            | Multi-tenant account boundaries                      | Root parent to all tenant-scoped entities.                                                  |
| `user_profiles`            | User identity linked to Supabase Auth (`auth.users`) | 1:M with `organization_memberships`, `task_comments`, `audit_logs`.                         |
| `roles`                    | System and tenant custom authorization roles         | 1:M with `role_permissions`, `organization_memberships`.                                    |
| `permissions`              | Atomic system capability flags                       | M:N with `roles` via `role_permissions`.                                                    |
| `role_permissions`         | Junction mapping roles to permissions                | FK to `roles` (CASCADE), FK to `permissions` (CASCADE).                                     |
| `organization_memberships` | User role assignment per organization                | FK to `organizations` (CASCADE), FK to `user_profiles` (CASCADE), FK to `roles` (SET NULL). |

### Group 2: Departments & Workforce

| Entity               | Purpose                                                 | Key Relationships                                                          |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `departments`        | Organizational divisions (Operations, Logistics, Fleet) | FK to `organizations`, FK to `user_profiles` (manager).                    |
| `workforce_members`  | Staff roster with employment metrics                    | FK to `organizations`, FK to `departments`, FK to `user_profiles`.         |
| `shift_schedules`    | Shift rota planning and time slots                      | FK to `organizations`, FK to `workforce_members`.                          |
| `attendance_records` | GPS-tagged clock-in/out records                         | FK to `organizations`, FK to `workforce_members`, FK to `shift_schedules`. |

### Group 3: CRM, Supply Chain & Equipment

| Entity               | Purpose                                         | Key Relationships                                                        |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `customers`          | Client accounts receiving services              | FK to `organizations`. 1:M with `projects`, `work_orders`, `invoices`.   |
| `suppliers`          | Material vendors and parts manufacturers        | FK to `organizations`. 1:M with `assets`, `inventory_items`.             |
| `assets`             | Fleet vehicles, diagnostic tools, and machinery | FK to `organizations`, FK to `workforce_members`, FK to `suppliers`.     |
| `inventory_items`    | Spare parts catalog with stock levels           | FK to `organizations`, FK to `suppliers`. 1:M with `stock_transactions`. |
| `stock_transactions` | Inbound/outbound ledger for inventory movements | FK to `organizations`, FK to `inventory_items`, FK to `work_orders`.     |

### Group 4: Projects, Dispatch & Tasks

| Entity                  | Purpose                                        | Key Relationships                                                                    |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `projects`              | Multi-phase operational projects               | FK to `organizations`, FK to `customers`, FK to `workforce_members` (lead).          |
| `project_members`       | Assigned team members per project              | FK to `organizations`, FK to `projects`, FK to `workforce_members`.                  |
| `project_milestones`    | Delivery schedule targets                      | FK to `organizations`, FK to `projects`.                                             |
| `service_requests`      | Inbound customer maintenance requests          | FK to `organizations`, FK to `customers`. 1:1 with `work_orders`.                    |
| `work_orders`           | Field service work orders and asset dispatches | FK to `organizations`, FK to `customers`, FK to `assets`, FK to `workforce_members`. |
| `work_order_checklists` | Safety and task completion checklists          | FK to `organizations`, FK to `work_orders`.                                          |
| `tasks`                 | Agile Kanban items                             | FK to `organizations`, FK to `projects`, FK to `work_orders`.                        |
| `task_assignments`      | Multi-member assignments on a task             | FK to `organizations`, FK to `tasks`, FK to `workforce_members`.                     |
| `task_comments`         | Collaboration message trail                    | FK to `organizations`, FK to `tasks`, FK to `user_profiles`.                         |
| `task_attachments`      | File documents and photo proofs on tasks       | FK to `organizations`, FK to `tasks`, FK to `user_profiles`.                         |

### Group 5: Financials & Governance

| Entity              | Purpose                                 | Key Relationships                                                      |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `expenses`          | Technician expense and per-diem claims  | FK to `organizations`, FK to `workforce_members`, FK to `work_orders`. |
| `expense_approvals` | Management approval decisions on claims | FK to `organizations`, FK to `expenses`, FK to `user_profiles`.        |
| `invoices`          | Billed customer receivables             | FK to `organizations`, FK to `customers`, FK to `work_orders`.         |
| `invoice_items`     | Itemized labor and parts billing        | FK to `organizations`, FK to `invoices`, FK to `inventory_items`.      |
| `payments`          | Customer payment receipts               | FK to `organizations`, FK to `invoices`, FK to `user_profiles`.        |
| `notifications`     | User alerts and broadcast events        | FK to `organizations`, FK to `user_profiles`.                          |
| `audit_logs`        | Immutable tamper-proof activity trail   | FK to `organizations`, FK to `user_profiles`.                          |

---

## 4. Integrity Constraints & Cascading Strategy

1. **Cascade on Tenant Deletion (`ON DELETE CASCADE`):** When an organization is removed, all tenant-owned records cascade cleanly to maintain zero orphaned rows.
2. **Restricted Deletion (`ON DELETE RESTRICT`):** Deleting a `customer` with active `invoices` or `projects` is blocked to protect accounting and delivery integrity.
3. **Nullification on User Separation (`ON DELETE SET NULL`):** Removing a user nullifies references in historical logs (`performed_by`, `uploaded_by`, `reviewed_by`, `assigned_to`) while keeping the operational records intact.
4. **Append-Only Tamper Protection:** `audit_logs` enforce PostgreSQL rules:
   ```sql
   CREATE RULE no_update_audit_logs AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
   CREATE RULE no_delete_audit_logs AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;
   ```
