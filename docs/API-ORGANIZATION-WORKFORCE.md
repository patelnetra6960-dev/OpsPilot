# OpsPilot API Specification: Organization, Membership & Employee APIs

**Document Version:** 1.0.0  
**Target Release:** Prompt 14 Architecture  
**Protocol:** RESTful JSON over HTTPS  
**Base URL:** `/api/v1`  
**Security Model:** Supabase JWT Bearer Authentication (`Authorization: Bearer <token>`) & Tenant Isolation Header (`X-Tenant-Id: <org_uuid>`)

---

## 1. Architectural Overview & Security Invariants

All endpoints in this specification enforce enterprise multi-tenancy, strict identity verification, and role-based access control (RBAC):

1. **Authentication:** Every route requires an authenticated user via `requireAuth` middleware.
2. **Tenant Scoping:** All operations targeting an active organization require the `X-Tenant-Id` header (UUID) and an active membership record verified by `requireTenant` middleware.
3. **Cross-Tenant Isolation:** Users are cryptographically prohibited from accessing or mutating resources outside their verified memberships (`FORBIDDEN_CROSS_TENANT_ACCESS`).
4. **Anti-Privilege Escalation:** Non-owners cannot elevate users to `owner`. Non-superadmins cannot modify superadmin flags. Self-role escalation is rejected (`protectPrivilegeEscalation`).
5. **Transactional Integrity:** Critical lifecycle operations (such as accepting an invitation or deactivating an employee) are executed as atomic multi-step database transactions to guarantee consistency across `organizations`, `organization_memberships`, `user_profiles`, and `workforce_members`.
6. **Owner Immutability Guard:** The primary organization owner cannot have their membership suspended or revoked, preventing orphan tenants.
7. **Anti-Cycle Reporting Guard:** An employee cannot be assigned as their own manager or supervisor.

---

## 2. Standard Headers & Error Envelopes

### Request Headers

| Header          | Type     | Required       | Description                                                                                  |
| --------------- | -------- | -------------- | -------------------------------------------------------------------------------------------- |
| `Authorization` | `string` | **Yes**        | Bearer JWT token (`Bearer <token>`).                                                         |
| `X-Tenant-Id`   | `UUID`   | **Yes\***      | Current active organization UUID (*Required for all `/current/*` and `/workforce/*` routes). |
| `Content-Type`  | `string` | For POST/PATCH | Must be `application/json`.                                                                  |

### Standard Response Envelope

All responses adhere to the standard OpsPilot API response contract:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "56a04624-de7e-4c4a-83e5-b1bb5a25bfcf",
    "timestamp": "2026-11-05T02:45:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ROLE_PERMISSIONS",
    "message": "Forbidden: Requires one of [owner, admin] roles",
    "details": null
  },
  "meta": {
    "requestId": "680a869d-ed53-4f4a-bcd6-abfc86e8c280",
    "timestamp": "2026-11-05T02:45:00.000Z"
  }
}
```

---

## 3. Organization APIs

### 3.1 List Affiliated Organizations

Returns all organizations where the authenticated user holds an active membership.

- **Method:** `GET`
- **Route:** `/api/v1/organizations/my`
- **Permissions:** Any authenticated user
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Acme Industries",
        "slug": "acme-industries",
        "role": "owner",
        "status": "active",
        "logo_url": "https://cdn.opspilot.com/logos/acme.png"
      }
    ]
  }
  ```

---

### 3.2 Create Organization

Provisions a new organization tenant, registers the caller as the `owner` membership, initializes default organization settings, and logs the action in the audit trail.

- **Method:** `POST`
- **Route:** `/api/v1/organizations`
- **Permissions:** Any authenticated user
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "Apex Innovations",
    "slug": "apex-innovations",
    "industry": "Clean Energy",
    "currency": "USD",
    "timezone": "America/New_York",
    "settings": {
      "theme": "light",
      "notification_email": "ops@apex-innovations.com"
    }
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Apex Innovations",
      "slug": "apex-innovations",
      "status": "active",
      "role": "owner",
      "created_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 3.3 Get Current Organization Details

Retrieves detailed metadata for the tenant specified in `X-Tenant-Id`.

- **Method:** `GET`
- **Route:** `/api/v1/organizations/current`
- **Permissions:** Active organization members (`owner`, `admin`, `manager`, `employee`, `member`)
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Acme Industries",
      "slug": "acme-industries",
      "status": "active",
      "currency": "USD",
      "timezone": "America/New_York",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 3.4 Update Organization Details

Updates tenant metadata (e.g. name, branding, timezone, contact email).

- **Method:** `PATCH`
- **Route:** `/api/v1/organizations/current`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "name": "Acme Global Solutions",
    "phone": "+1 (555) 234-5678",
    "address": {
      "city": "Austin",
      "state": "TX",
      "country": "USA"
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Acme Global Solutions",
      "phone": "+1 (555) 234-5678",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 3.5 Get Organization Settings

Retrieves operational configurations including branding, shift settings, notification hooks, and currency formats.

- **Method:** `GET`
- **Route:** `/api/v1/organizations/current/settings`
- **Permissions:** Active organization members
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "organization_id": "11111111-1111-1111-1111-111111111111",
      "theme": "system",
      "fiscal_year_start": "01-01",
      "invoice_prefix": "INV-",
      "work_order_prefix": "WO-",
      "enable_geo_fencing": true,
      "default_currency": "USD"
    }
  }
  ```

---

### 3.6 Update Organization Settings

Updates tenant operational parameters with partial merges.

- **Method:** `PATCH`
- **Route:** `/api/v1/organizations/current/settings`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "theme": "dark",
    "enable_geo_fencing": false,
    "work_order_prefix": "WO-2026-"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "organization_id": "11111111-1111-1111-1111-111111111111",
      "theme": "dark",
      "work_order_prefix": "WO-2026-",
      "enable_geo_fencing": false,
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

## 4. Membership & Invitation APIs

### 4.1 List Organization Members

Lists all active, suspended, and invited memberships for the current tenant.

- **Method:** `GET`
- **Route:** `/api/v1/organizations/members`
- **Permissions:** Active organization members
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mem-1",
        "user_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "organization_id": "11111111-1111-1111-1111-111111111111",
        "role": "owner",
        "status": "active",
        "user": {
          "email": "alex.chen@acme.com",
          "full_name": "Alex Chen",
          "avatar_url": null
        }
      }
    ]
  }
  ```

---

### 4.2 Add Member Directly

Enrolls an existing user directly into the organization.

- **Method:** `POST`
- **Route:** `/api/v1/organizations/members`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "role": "employee",
    "department_id": "dept-acme-1"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem-99",
      "user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "role": "employee",
      "status": "active",
      "created_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 4.3 Update Member Role

Modifies a member's role within the organization. Protected against privilege escalation (non-superadmins cannot modify own role; non-owners cannot grant owner status).

- **Method:** `PATCH`
- **Route:** `/api/v1/organizations/members/:memberId`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "role": "manager"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem-2",
      "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "role": "manager",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 4.4 Activate / Suspend Membership Status

Updates a user's membership state. When status is set to `suspended`, linked workforce records are automatically transitioned to `terminated`. Primary organization owners cannot be suspended.

- **Method:** `PATCH`
- **Route:** `/api/v1/organizations/members/:memberId/status`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "status": "suspended"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem-2",
      "status": "suspended",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 4.5 Create Membership Invitation

Generates a cryptographic 64-character invite token and dispatches an invitation record for joining the organization.

- **Method:** `POST`
- **Route:** `/api/v1/organizations/invitations`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "email": "jordan.sparks@acme.com",
    "role": "employee",
    "department_id": "dept-acme-1"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "inv-17938268",
      "organization_id": "11111111-1111-1111-1111-111111111111",
      "email": "jordan.sparks@acme.com",
      "role": "employee",
      "status": "pending",
      "token": "7a8b9c...64_chars...4d5e",
      "expires_at": "2026-11-12T02:45:00.000Z",
      "created_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 4.6 List Membership Invitations

Retrieves pending and past invitations for the current organization with pagination.

- **Method:** `GET`
- **Route:** `/api/v1/organizations/invitations?page=1&limit=20`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "inv-17938268",
        "email": "jordan.sparks@acme.com",
        "role": "employee",
        "status": "pending",
        "expires_at": "2026-11-12T02:45:00.000Z"
      }
    ],
    "meta": {
      "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    }
  }
  ```

---

### 4.7 Revoke Invitation

Cancels and invalidates an outstanding invitation token.

- **Method:** `DELETE`
- **Route:** `/api/v1/organizations/invitations/:invitationId`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "revoked": true,
      "id": "inv-17938268"
    }
  }
  ```

---

### 4.8 Accept Invitation (Join Tenant)

Executes a multi-step database transaction:

1. Validates token authenticity, non-expiration, and pending status.
2. Creates or activates user `organization_memberships` record.
3. Automatically creates or links `workforce_members` profile for internal roles.
4. Marks the invitation record as `accepted`.

- **Method:** `POST`
- **Route:** `/api/v1/organizations/invitations/:token/accept`
- **Permissions:** Authenticated user holding the invite token
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "full_name": "Jordan Sparks",
    "phone": "+1 555-0199"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Invitation accepted successfully",
      "membership": {
        "organization_id": "11111111-1111-1111-1111-111111111111",
        "role": "employee",
        "status": "active"
      },
      "workforceMember": {
        "id": "wm-99",
        "employee_code": "EMP-4102",
        "status": "active"
      }
    }
  }
  ```

---

## 5. Employee & Workforce APIs

### 5.1 List Employees (Directory)

Lists organization employees with multi-criteria search, filtering, and pagination.

- **Method:** `GET`
- **Route:** `/api/v1/workforce`
- **Permissions:** `owner`, `admin`, `manager`, `employee`, `member`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Query Parameters:**

  | Parameter    | Type      | Required                   | Description                                                                    |
  | ------------ | --------- | -------------------------- | ------------------------------------------------------------------------------ |
  | `page`       | `integer` | No (default: 1)            | Current page index.                                                            |
  | `limit`      | `integer` | No (default: 20)           | Records per page (max: 100).                                                   |
  | `search`     | `string`  | No                         | Search across full name, email, and employee code.                             |
  | `department` | `string`  | No                         | Filter by department name or ID.                                               |
  | `role`       | `string`  | No                         | Filter by permitted role (`admin`, `manager`, `employee`, `technician`).       |
  | `status`     | `string`  | No                         | Filter by employment status (`active`, `on_leave`, `suspended`, `terminated`). |
  | `sortBy`     | `string`  | No (default: `created_at`) | Field name to sort by (`first_name`, `created_at`, etc.).                      |
  | `sortOrder`  | `string`  | No (default: `desc`)       | Sort direction (`asc` or `desc`).                                              |

- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "w1",
        "organization_id": "11111111-1111-1111-1111-111111111111",
        "first_name": "Marcus",
        "last_name": "Vance",
        "email": "marcus.vance@acme.com",
        "role": "manager",
        "designation": "Lead Field Supervisor",
        "department": "Field Operations",
        "department_id": "dept-acme-1",
        "status": "active",
        "employee_code": "EMP-1001",
        "rating": 4.9,
        "completed_jobs": 142
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 6,
        "totalPages": 1,
        "hasNext": false,
        "hasPrev": false
      }
    }
  }
  ```

---

### 5.2 Workforce Statistics

Returns aggregated workforce operational metrics for dashboards and department telemetry.

- **Method:** `GET`
- **Route:** `/api/v1/workforce/stats`
- **Permissions:** `owner`, `admin`, `manager`, `employee`, `member`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "totalEmployees": 6,
      "activeCount": 5,
      "onLeaveCount": 1,
      "terminatedCount": 0,
      "departmentBreakdown": {
        "Field Operations": 2,
        "HVAC & Thermal Systems": 2,
        "Warehouse Logistics": 2
      }
    }
  }
  ```

---

### 5.3 Create Employee Profile

Creates a new workforce record inside the tenant. If an existing `user_id` or unique `email` is supplied, checks for conflict prevention.

- **Method:** `POST`
- **Route:** `/api/v1/workforce`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "first_name": "Clara",
    "last_name": "Oswald",
    "email": "clara.oswald@acme.com",
    "phone": "+1 555-0144",
    "designation": "Senior Diagnostics Specialist",
    "department_id": "dept-acme-1",
    "role": "employee",
    "employee_code": "EMP-3042",
    "hourly_rate": 55.0,
    "salary": 110000.0,
    "hire_date": "2026-03-01",
    "status": "active"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "wm-1793826733148-ro0l",
      "organization_id": "11111111-1111-1111-1111-111111111111",
      "first_name": "Clara",
      "last_name": "Oswald",
      "email": "clara.oswald@acme.com",
      "employee_code": "EMP-3042",
      "designation": "Senior Diagnostics Specialist",
      "role": "employee",
      "status": "active",
      "created_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 5.4 View Employee Details

Retrieves complete employee record, including supervisor relationships, department details, and system user profile.

- **Method:** `GET`
- **Route:** `/api/v1/workforce/:id`
- **Permissions:** `owner`, `admin`, `manager`, `employee`, `member`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "w1",
      "first_name": "Marcus",
      "last_name": "Vance",
      "email": "marcus.vance@acme.com",
      "role": "manager",
      "designation": "Lead Field Supervisor",
      "department": "Field Operations",
      "department_id": "dept-acme-1",
      "manager_id": null,
      "manager": null,
      "status": "active",
      "hourly_rate": 65.0,
      "skills": ["Electrical", "HVAC-Master", "Safety Lead"],
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 5.5 Update Employee Details

Updates contact info, salary, hourly rate, skills, and emergency contact details.

- **Method:** `PATCH`
- **Route:** `/api/v1/workforce/:id`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "designation": "Lead Diagnostic Director",
    "hourly_rate": 62.5,
    "phone": "+1 555-0987"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "wm-1793826733148-ro0l",
      "designation": "Lead Diagnostic Director",
      "hourly_rate": 62.5,
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 5.6 Assign Department

Assigns an employee to an organization department, verifying department tenant ownership.

- **Method:** `PATCH`
- **Route:** `/api/v1/workforce/:id/department`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "department_id": "dept-acme-2"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "wm-1793826733148-ro0l",
      "department_id": "dept-acme-2",
      "department": "HVAC & Thermal Systems",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 5.7 Assign Reporting Manager

Assigns a supervisor or manager to the employee. Includes strict anti-cycle validation: an employee cannot be their own manager (`INVALID_MANAGER_CYCLE`).

- **Method:** `PATCH`
- **Route:** `/api/v1/workforce/:id/manager`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "manager_id": "w1"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "wm-1793826733148-ro0l",
      "manager_id": "w1",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```
- **Cycle Prevention Error `400 Bad Request`:**
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_MANAGER_CYCLE",
      "message": "Self-management cycle prevented: An employee cannot be their own manager"
    }
  }
  ```

---

### 5.8 Change Permitted Role

Alters the organization role associated with the workforce member.

- **Method:** `PATCH`
- **Route:** `/api/v1/workforce/:id/role`
- **Permissions:** `owner`, `admin`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Request Body:**
  ```json
  {
    "role": "manager"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "w1",
      "role": "manager",
      "updated_at": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

### 5.9 Deactivate Employee

Executes a multi-step deactivation transaction:

1. Sets workforce member `status` to `terminated`.
2. Populates `deleted_at` timestamp (soft-delete).
3. Synchronizes and suspends the user's `organization_memberships` record if associated.
4. Revokes active session tokens to terminate organization access immediately.

- **Method:** `DELETE` or `PATCH`
- **Route:** `/api/v1/workforce/:id` or `/api/v1/workforce/:id/deactivate`
- **Permissions:** `owner`, `admin`, `manager`
- **Headers:** `Authorization: Bearer <token>`, `X-Tenant-Id: <org_id>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "wm-1793826733148-ro0l",
      "status": "terminated",
      "deactivatedAt": "2026-11-05T02:45:00.000Z"
    }
  }
  ```

---

## 6. Security & Negative Isolation Test Matrix

The following table summarizes the security assertions validated in our continuous test suite:

| Test Assertion                                 | HTTP Status        | Error Code                          | Reason                                         |
| ---------------------------------------------- | ------------------ | ----------------------------------- | ---------------------------------------------- |
| Unauthenticated request                        | `401 Unauthorized` | `UNAUTHORIZED`                      | Missing Authorization Bearer token             |
| Missing `X-Tenant-Id` header                   | `400 Bad Request`  | `TENANT_HEADER_REQUIRED`            | Cannot determine organization context          |
| User Marcus from Apex accessing Acme           | `403 Forbidden`    | `FORBIDDEN_CROSS_TENANT_ACCESS`     | Cross-tenant breach blocked                    |
| Customer account accessing `/api/v1/workforce` | `403 Forbidden`    | `INSUFFICIENT_ROLE_PERMISSIONS`     | Customer accounts isolated from workforce APIs |
| Employee role creating workforce member        | `403 Forbidden`    | `INSUFFICIENT_ROLE_PERMISSIONS`     | Creation restricted to manager/admin/owner     |
| Assigning employee as their own manager        | `400 Bad Request`  | `INVALID_MANAGER_CYCLE`             | Anti-cycle reporting validation triggered      |
| Suspending primary organization owner          | `403 Forbidden`    | `FORBIDDEN_CANNOT_DEACTIVATE_OWNER` | Tenant protection against orphan state         |
| User deactivating their own membership         | `400 Bad Request`  | `CANNOT_DEACTIVATE_SELF`            | Prevents lockout                               |
| Duplicate employee email in tenant             | `409 Conflict`     | `EMPLOYEE_ALREADY_EXISTS`           | Unique workforce email constraint enforced     |
