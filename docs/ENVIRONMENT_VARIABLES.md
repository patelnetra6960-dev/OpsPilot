# OpsPilot Environment Variable Specification

> **Classification Standard:**
> - 🟢 **PUBLIC:** Safe for client-side bundle; exposed in browser JavaScript.
> - 🟡 **INTERNAL:** Server-side configuration; non-sensitive infrastructure settings.
> - 🔴 **CONFIDENTIAL:** Private server secrets; must never be committed or leaked to client.
> - ⛔ **TOP-SECRET:** Service role keys and master database credentials; strictly managed via Vault / KMS.

---

## 1. Frontend Environment Variables (`client/.env`)

These variables are injected at Vite compile time. **NEVER** place confidential API keys, service role keys, or database credentials here.

| Variable Name | Type | Default Value | Required | Security | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | `/api/v1` | No | 🟢 PUBLIC | Base URL for REST API calls. In containerized setups, defaults to relative `/api/v1`. |
| `VITE_SUPABASE_URL` | String | `https://[PROJECT].supabase.co` | Yes | 🟢 PUBLIC | Supabase project endpoint for auth sessions and storage downloads. |
| `VITE_SUPABASE_ANON_KEY`| String | `[ANON_JWT_TOKEN]` | Yes | 🟢 PUBLIC | Public client anonymous key. Subject to PostgreSQL Row Level Security (RLS). |

---

## 2. Backend Server Configuration (`server/.env`)

### 2.1 Core HTTP & Process Configuration

| Variable Name | Type | Default Value | Required | Security | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Enum | `development` | Yes | 🟡 INTERNAL | Environment mode (`development`, `production`, `test`). |
| `PORT` | Integer | `5000` | No | 🟡 INTERNAL | HTTP listening port for Express backend. |
| `CLIENT_URL` | String | `http://localhost:5173` | No | 🟡 INTERNAL | Primary client frontend origin. |
| `CORS_ALLOWED_ORIGINS` | String | `http://localhost:5173` | No | 🟡 INTERNAL | Comma-separated allowed origins or domain wildcard regexes (e.g. `https://*.opspilot.com`). |
| `RATE_LIMIT_WINDOW_MS` | Integer | `900000` (15m) | No | 🟡 INTERNAL | Rolling window in ms for rate limiting. |
| `RATE_LIMIT_MAX` | Integer | `1000` | No | 🟡 INTERNAL | Max HTTP requests per IP window. |

### 2.2 Supabase & Security Credentials

| Variable Name | Type | Default Value | Required | Security | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | String | `https://[PROJECT].supabase.co` | Yes | 🟡 INTERNAL | Supabase project URL for server-side SDK operations. |
| `SUPABASE_ANON_KEY` | String | `[ANON_JWT_TOKEN]` | Yes | 🟡 INTERNAL | Standard anonymous token for user context validation. |
| `SUPABASE_SERVICE_ROLE_KEY` | String | `[SERVICE_ROLE_SECRET]` | Yes | ⛔ TOP-SECRET | Master administrative key bypassing RLS. Used exclusively for background workers. |
| `SUPABASE_JWT_SECRET` | String | `[MIN_32_CHAR_SECRET]` | Yes | 🔴 CONFIDENTIAL | Cryptographic secret used by Express middleware to verify user Bearer tokens. |

### 2.3 PostgreSQL Database Connection Strings

| Variable Name | Type | Default Value | Required | Security | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | `postgresql://...:5432/postgres` | Yes | 🔴 CONFIDENTIAL | Direct session connection string on port 5432. Required for migrations and DDL. |
| `DATABASE_POOLER_URL` | String | `postgresql://...:6543/postgres?pgbouncer=true` | No | 🔴 CONFIDENTIAL | PgBouncer transaction pooler connection on port 6543 for high-throughput server queries. |

### 2.4 Redis & BullMQ Workflow Automation

| Variable Name | Type | Default Value | Required | Security | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REDIS_URL` | String | `redis://default:[PASS]@[HOST]:6379` | No | 🔴 CONFIDENTIAL | Full Redis URI (takes priority if provided). |
| `REDIS_HOST` | String | `localhost` | No | 🟡 INTERNAL | Redis broker hostname. |
| `REDIS_PORT` | Integer | `6379` | No | 🟡 INTERNAL | Redis broker TCP port. |
| `REDIS_PASSWORD` | String | `""` | No | 🔴 CONFIDENTIAL | Redis authentication password. |

---

## 3. Production Environment File Template (`.env.production`)

```env
# =====================================================================
# OpsPilot Production Environment Configuration
# =====================================================================

NODE_ENV=production
PORT=5000
CLIENT_URL=https://app.opspilot.com
CORS_ALLOWED_ORIGINS=https://app.opspilot.com,https://opspilot.com,https://*.opspilot.com

# Supabase Production Backend
SUPABASE_URL=https://prod-opspilot.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...[PUBLIC_KEY]...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...[SUPER_ADMIN_KEY]...
SUPABASE_JWT_SECRET=c2VjdXJlLXByb2Qtand0LXNlY3JldC0zMi1jaGFyYWN0ZXJzLWxvbmc=

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:[STRONG_PASSWORD]@db.prod-opspilot.supabase.co:5432/postgres?sslmode=require
DATABASE_POOLER_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Redis Worker Broker
REDIS_HOST=redis-prod.opspilot.internal
REDIS_PORT=6379
REDIS_PASSWORD=a98bf723e410cda92f9882ab012d98f7

# Rate Limiting & Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=2000
```
