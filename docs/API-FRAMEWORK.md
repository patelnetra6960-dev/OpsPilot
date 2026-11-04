# OpsPilot Complete CRUD & Business API Framework

**Document Version:** 1.0.0  
**Target Release:** Prompt 15 Architecture  
**Base Route:** `/api/v1`  
**Interactive Documentation:** `/api/v1/docs` (Swagger UI) & `/api/v1/docs/openapi.json` (OpenAPI 3.0.3)

---

## 1. Architectural Philosophy & Core Invariants

OpsPilot delivers an enterprise modular monolith for operations and workforce management. The Business API Framework standardizes all domain modules (`customers`, `workforce`, `projects`, `tasks`, `work_orders`, `invoices`, `expenses`, `assets`) into a cohesive, secure, and easily testable pattern.

### Non-Negotiable Invariants:

1. **Tenant Isolation by Construction:** No business module can bypass tenant isolation. Every query and mutation through `BaseRepository`, `BaseService`, and `BaseController` strictly enforces `organization_id`. Any tenant-scoped repository invocation without `organization_id` immediately throws `TenantIsolationError` (`FORBIDDEN_CROSS_TENANT_ACCESS`).
2. **Dedicated Domain Endpoints with Business-Specific Validation:** We explicitly avoid dangerous, generic "query-any-table" endpoints (`/api/data/:table`). Every business module defines its own typed Zod request validation schemas, permitted fields, search fields, and state machine lifecycle hooks.
3. **HTTP Verb Semantics:**
   - `GET`: Read-only queries (paginated lists, detail lookups).
   - `POST`: Creation of new entities (HTTP 201 Created) and state-machine business actions (`POST /:id/actions/:action`).
   - `PATCH`: Partial updates (HTTP 200 OK).
   - `DELETE`: Safe soft-deletion with audit retention (HTTP 200 OK).
4. **Standard Status Codes:**
   - `200 OK`: Successful read, update, delete, or business action.
   - `201 Created`: Successful entity creation.
   - `400 Bad Request`: Zod schema validation errors or missing required headers.
   - `401 Unauthorized`: Missing, invalid, or expired Supabase JWT token.
   - `403 Forbidden`: Insufficient RBAC role permissions or cross-tenant boundary breach.
   - `404 Not Found`: Entity does not exist within the active organization tenant.
   - `409 Conflict`: Unique constraint violation (e.g. duplicate email or identifier within tenant).
   - `422 Unprocessable Entity`: Semantic business rule violation or unsupported action.
   - `500 Internal Server Error`: Centralized uncaught error handling.

---

## 2. Framework Components

### 2.1 Base Repository (`server/src/repositories/base.repository.js`)

Encapsulates all PostgreSQL / Supabase interactions with:

- **Tenant Scope Enforcement:** Injects `organization_id` into all queries and mutations.
- **Soft Delete Management:** Filters out soft-deleted records (`deleted_at IS NULL`) by default, with opt-in `includeDeleted: true` for audit/recovery.
- **Search Engine:** Performs multi-column case-insensitive search (`.ilike.%query%` in PostgreSQL, case-insensitive substring matching in mock).
- **Dynamic Filtering:** Filters against declared `allowedFilterFields` with type-safe equality checks.
- **Date Range Filters:** Automatic `from_date` and `to_date` bounding on timestamps.
- **Sorting & Pagination:** Clamps limits between 1 and 100, computes offset, total count, total pages, and next/previous flags.

### 2.2 Base Service (`server/src/services/base.service.js`)

Encapsulates business rules and entity lifecycle hooks:

- `list(organizationId, queryOptions, context)`
- `getById(id, organizationId, context)`
- `create(payload, organizationId, context)`: Triggers `beforeCreate` and `afterCreate`.
- `update(id, updates, organizationId, context)`: Triggers `beforeUpdate` and `afterUpdate`.
- `delete(id, organizationId, context)`: Triggers `beforeDelete` and `afterDelete`.
- `executeAction(id, actionName, payload, organizationId, context)`: Dispatches to domain action handlers (e.g. `handleAction_suspend`, `handleAction_activate`).

### 2.3 Base Controller (`server/src/controllers/base.controller.js`)

Standardizes request unpacking and response formatting:

- Extracts `organizationId` from `req.tenant.id`.
- Extracts caller metadata (`user`, `membership`, `token`, `requestId`).
- Dispatches to service layer wrapped in `asyncHandler`.
- Formats uniform HTTP responses using `sendSuccess` and `sendPaginated`.

### 2.4 CRUD Router Factory (`server/src/routes/crudRouterFactory.js`)

Generates standardized Express routers:

```javascript
export const customersRouter = createCrudRouter({
  controller: customerController,
  validator: customerValidator,
  roles: {
    read: ['owner', 'admin', 'manager', 'employee', 'member'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin'],
    action: ['owner', 'admin', 'manager']
  }
});
```

---

## 3. OpenAPI 3.0 & Swagger UI

Interactive API documentation is integrated and served directly from the server:

- **Swagger UI Interactive Interface:** `GET /api/v1/docs/` (or quick redirect `GET /docs`)
- **Raw OpenAPI 3.0.3 Specification:** `GET /api/v1/docs/openapi.json`
- **Security Schemes Documented:**
  - `BearerAuth`: `Authorization: Bearer <jwt>`
  - `TenantHeader`: `X-Tenant-Id: <uuid>`

---

## 4. Reusable Test Utilities (`server/src/tests/testUtils.js`)

Test utilities provide helpers for integration testing:

- `TEST_PERSONAS`: Canonical personas with tokens, roles, and tenant associations (Alex Rivera, Sarah Chen, David Miller, Rachel Green, Marcus Vance, Victoria Root).
- `TEST_TENANTS`: Canonical tenant UUIDs (`ACME`, `APEX`).
- `makeAuthHeaders(token, tenantId)`: Constructs standard headers.
- `assertSuccessEnvelope(res, expectedStatus)`: Validates 200/201 response envelope.
- `assertPaginatedEnvelope(res, expectedStatus)`: Validates pagination envelope.
- `assertErrorEnvelope(res, expectedStatus, expectedErrorCode)`: Validates structured error response.
- `assertRequiresAuth(app, method, url)`: Verifies 401 response on missing token.
- `assertRequiresTenantHeader(app, method, url, token)`: Verifies 400 response on missing tenant header.
- `assertBlocksCrossTenantAccess(app, method, url, foreignToken, targetTenantId)`: Verifies 403 `FORBIDDEN_CROSS_TENANT_ACCESS`.

---

## 5. Reference Module: Customers API

The `customers` module serves as the primary reference implementation:

| HTTP Verb | Path                                    | Description                                           | Roles                           | Status      |
| --------- | --------------------------------------- | ----------------------------------------------------- | ------------------------------- | ----------- |
| `GET`     | `/api/v1/customers`                     | List customers with pagination, search, and filtering | Owner, Admin, Manager, Employee | 200 OK      |
| `GET`     | `/api/v1/customers/:id`                 | Get customer details by ID                            | Owner, Admin, Manager, Employee | 200 OK      |
| `POST`    | `/api/v1/customers`                     | Create new customer entity                            | Owner, Admin, Manager           | 201 Created |
| `PATCH`   | `/api/v1/customers/:id`                 | Partial update of customer details                    | Owner, Admin, Manager           | 200 OK      |
| `DELETE`  | `/api/v1/customers/:id`                 | Soft-delete customer entity                           | Owner, Admin                    | 200 OK      |
| `POST`    | `/api/v1/customers/:id/actions/:action` | Execute business action (`suspend`, `activate`)       | Owner, Admin, Manager           | 200 OK      |
