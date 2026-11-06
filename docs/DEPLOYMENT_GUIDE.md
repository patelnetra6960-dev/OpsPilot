# OpsPilot Production Deployment Guide

> **Document Version:** 1.0.0  
> **Target Release:** OpsPilot v1.0 Production  
> **Architecture:** Multi-Tenant Enterprise Operations SaaS (Node.js Express + React Vite + PostgreSQL 16 / Supabase + Redis BullMQ)

---

## 1. System Architecture Overview

OpsPilot employs a hardened, containerized multi-tenant SaaS architecture designed for high availability, zero-downtime deployments, and strict cryptographic tenant isolation.

```
                  ┌──────────────────────────────────────────────┐
                  │        Cloudflare / Edge DNS (HTTPS/SSL)      │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
      ┌──────────────────────┐                       ┌──────────────────────┐
      │   Frontend Client    │                       │    Backend API       │
      │   (Nginx Alpine /    │                       │  (Node.js 22 LTS /   │
      │   Vercel / Netlify)  │                       │   Docker Container)  │
      └──────────┬───────────┘                       └──────────┬───────────┘
                 │                                               │
                 │ /api/v1 (REST) & /socket.io (WebSockets)      │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       Load Balancer / Reverse Proxy           │
                 │         (Health, Liveness, Readiness)         │
                 └───────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
      ┌──────────────────────┐                       ┌──────────────────────┐
      │  Supabase / Postgres │                       │    Redis Queue       │
      │  32 Shielded Tables  │                       │   (BullMQ Worker)    │
      │  Row Level Security  │                       │  Deduplication Store │
      └──────────────────────┘                       └──────────────────────┘
```

---

## 2. Prerequisites & Infrastructure Sizing

### 2.1 Hardware Sizing Recommendations

| Component | Minimum (Staging / Low Volume) | Recommended (Production / High Volume) |
| :--- | :--- | :--- |
| **Backend API** | 1 vCPU, 1 GB RAM (2 replicas) | 2 vCPU, 4 GB RAM (3–5 autoscaled replicas) |
| **Frontend CDN** | Serverless / Alpine Nginx (256 MB) | Edge CDN + Multi-AZ Nginx containers |
| **PostgreSQL** | Supabase Pro (2 Core, 4 GB RAM) | Supabase Team/Enterprise or RDS (4 Core, 16 GB RAM) |
| **Redis** | Redis Cloud 250 MB | AWS ElastiCache / Redis Cloud 1 GB HA cluster |

---

## 3. Database Deployment (Supabase Production Project)

### 3.1 Project Provisioning
1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Select your target cloud region (e.g., `us-east-1` or `eu-west-1`) closest to your primary user base.
3. Configure a strong database password (store in a team secret vault such as 1Password or AWS Secrets Manager).

### 3.2 Executing Migrations in Production

OpsPilot migrations are 100% idempotent and tracked inside the `_schema_migrations` table.

```bash
# Set your production database URL (Direct connection on port 5432)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Run the automated migration runner
npm run db:migrate
```

### 3.3 Verifying Row Level Security (RLS)

Run the verification script to audit all 32 public domain tables:

```bash
npm run verify:rls
```

All 32 tables must report `RLS ENABLED: YES` with `STATUS: PASSED`.

---

## 4. Backend Deployment

### 4.1 Container Build (Docker)

OpsPilot Backend includes a hardened, multi-stage Alpine Dockerfile located at `server/Dockerfile`.

```bash
# Build production image
docker build -t opspilot-server:latest -f server/Dockerfile server/

# Test image locally
docker run -d -p 5000:5000 \
  --env-file server/.env.production \
  --name opspilot-server-test \
  opspilot-server:latest
```

### 4.2 Hosting Platform Options

#### Option A: Render / Railway / Fly.io (PaaS)
1. Link your GitHub repository.
2. Set Root Directory to `server`.
3. Build Command: `npm ci --omit=dev`
4. Start Command: `node src/server.js`
5. Configure Health Check Path: `/api/v1/health/liveness`
6. Ingress / Port: `5000`

#### Option B: AWS ECS / Fargate (Containerized)
1. Push the Docker image to AWS ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
   docker tag opspilot-server:latest [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/opspilot-server:latest
   docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/opspilot-server:latest
   ```
2. In the ECS Task Definition:
   - Configure container port `5000`.
   - Setup ALB Target Group health checks:
     - Health Path: `/health` or `/api/v1/health/liveness`
     - Healthy Threshold: 2
     - Unhealthy Threshold: 3
     - Timeout: 5s
     - Interval: 30s
   - Graceful shutdown stop timeout: `30 seconds`.

---

## 5. Frontend Deployment

### 5.1 Static CDN Deployment (Vercel / Netlify)

OpsPilot frontend is built with React 19 and Vite.

1. Connect GitHub repository to Vercel or Netlify.
2. Root Directory: `client`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure Environment Variables:
   - `VITE_API_URL`: `https://api.opspilot.com/api/v1`
   - `VITE_SUPABASE_URL`: `https://[PROJECT-REF].supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[ANON_KEY]`
6. Ensure SPA rewrite rules are enabled:
   - Netlify `_redirects`: `/* /index.html 200`
   - Vercel `vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```

### 5.2 Containerized Nginx Deployment (Docker)

For self-hosted Kubernetes or Docker Compose:
```bash
docker build \
  --build-arg VITE_API_URL=/api/v1 \
  --build-arg VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=[ANON_KEY] \
  -t opspilot-client:latest -f client/Dockerfile client/

docker run -d -p 80:80 opspilot-client:latest
```

---

## 6. Domain, HTTPS & SSL Configuration

1. **DNS Records (Cloudflare / Route 53):**
   - `A` or `CNAME` for `app.opspilot.com` -> Frontend hosting endpoint.
   - `A` or `CNAME` for `api.opspilot.com` -> Backend Load Balancer / PaaS domain.
2. **TLS / SSL Certificates:**
   - Enforce TLS 1.3 with automated certificate renewal (Let's Encrypt / AWS ACM).
   - Enable HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).

---

## 7. Zero-Downtime Deployment Protocol

To release updates with 0% dropped connections:

1. **Phase 1 (Database Migration):** Run non-breaking backward-compatible schema changes first.
2. **Phase 2 (Canary Backend):** Deploy new backend container images using rolling update with 25% max-surge.
3. **Phase 3 (Readiness Verification):** The Load Balancer validates `/api/v1/health/readiness` before routing incoming traffic.
4. **Phase 4 (Drain Old Replicas):** Old instances receive `SIGTERM` and execute `gracefulShutdown()` within 10s.
5. **Phase 5 (Frontend Static Assets):** Deploy new static assets to CDN with immutable cache hashes.
6. **Phase 6 (Automated Smoke Test):**
   ```bash
   node scripts/smoke-test.js https://api.opspilot.com
   ```
