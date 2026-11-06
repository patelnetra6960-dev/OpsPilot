# OpsPilot Local Setup & Execution Guide

This guide provides step-by-step instructions for installing, configuring, running, and managing **OpsPilot** locally on your workstation.

---

## 1. System Requirements & Prerequisites

Ensure the following software packages are installed on your machine before setup:

| Dependency | Minimum Version | Recommended Version | Verification Command | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | `v20.0.0+` | `v22.12.0 LTS` | `node -v` | Core JavaScript runtime for backend and frontend tooling |
| **npm** | `v10.0.0+` | `v10.9.0+` | `npm -v` | Monorepo package and workspace manager |
| **Git** | `v2.40.0+` | `v2.47.0+` | `git --version` | Version control |
| **Docker** *(Optional)* | `v24.0+` | `v27.0+` | `docker --version` | Full-stack containerized execution |
| **Docker Compose** *(Optional)* | `v2.20+` | `v2.29+` | `docker compose version` | Multi-container local stack orchestration |
| **Supabase CLI** *(Optional)* | `v1.190+` | `v2.12.0+` | `supabase --version` | Local PostgreSQL + GoTrue + Storage stack |

> [!NOTE]
> **Zero-Dependency Mode:** OpsPilot features a built-in development database engine and mock Supabase/auth provider. You can run and test all application features **immediately without installing Docker, PostgreSQL, or Supabase CLI**. If you prefer a live PostgreSQL instance, instructions for local Supabase and Docker Compose are also provided below.

---

## 2. Repository Structure & Workspace Layout

OpsPilot is architected as an npm-managed modular monorepo:

```text
OpsPilot/
├── package.json              # Monorepo root workspace & master test scripts
├── docker-compose.yml        # Orchestration (Postgres 16, Redis 7, Server, Client)
├── playwright.config.js      # End-to-end browser testing configuration
├── .env.example              # Root environment variable template
├── scripts/                  # Operations, health checks, dev launcher, and smoke tests
│   ├── dev.js                # Dual-process launcher for server and client
│   ├── check-env.js          # Environment file validator and credential leak guard
│   ├── smoke-test.js         # Production HTTP health & latency validator
│   └── verify-rls.js         # Row Level Security policy static auditor
├── server/                   # Express 4.21 Modular Monolith Backend
│   ├── package.json          # Backend dependencies (Socket.IO, BullMQ, pg, zod)
│   ├── Dockerfile            # Hardened Node 22 Alpine production container
│   ├── .env.example          # Backend environment variable template
│   └── src/
│       ├── server.js         # HTTP server, graceful shutdown & Socket.IO initialization
│       ├── app.js            # Express app, middleware pipeline & route mounts
│       ├── config/           # Environment validation, CORS, permissions & Supabase
│       ├── routes/           # Versioned API routes (/api/v1/...)
│       ├── services/         # Business logic & transaction managers
│       └── socket/           # Real-time rooms, events & deduplication engine
├── client/                   # React 19 + Vite 6 Frontend Application
│   ├── package.json          # Frontend dependencies (Redux, Tailwind, TanStack Query)
│   ├── Dockerfile            # Multi-stage production container with Nginx 1.27
│   ├── nginx.conf            # Hardened Nginx reverse proxy & security headers
│   ├── .env.example          # Client environment variable template
│   └── src/
│       ├── routes/           # Code-split lazy-loaded route definitions (AppRoutes.jsx)
│       ├── features/         # Domain components & hooks (Auth, Projects, Tasks, etc.)
│       └── services/         # Axios API client & Supabase client
└── database/                 # PostgreSQL migrations (14 sequential migrations)
    └── migrations/           # Normalized schemas, views, constraints & RLS policies
```

---

## 3. Environment Variable Configuration

OpsPilot uses `.env` files for configuration. Example templates are provided across the repository.

### Step 3.1: Configure Root Environment File
Copy `.env.example` in the project root to `.env`:

```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux / macOS / Bash:
cp .env.example .env
```

### Step 3.2: Configure Server Environment File
Copy `server/.env.example` to `server/.env`:

```bash
# On Windows PowerShell:
Copy-Item server/.env.example server/.env

# On Linux / macOS / Bash:
cp server/.env.example server/.env
```

**Key Server Environment Variables (`server/.env`):**

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Supabase Configuration
# Keep default mock values for zero-dependency local development:
SUPABASE_URL=https://mock-opspilot.supabase.co
SUPABASE_ANON_KEY=mock-anon-key-opspilot-2026
SUPABASE_SERVICE_ROLE_KEY=mock-service-role-key-opspilot-2026
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# PostgreSQL Connection (Optional: only needed if connecting to a real database)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Optional AI Assistant Keys (Leave empty to use simulated AI responses)
GEMINI_API_KEY=
OPENAI_API_KEY=
```

### Step 3.3: Configure Client Environment File
Copy `client/.env.example` to `client/.env`:

```bash
# On Windows PowerShell:
Copy-Item client/.env.example client/.env

# On Linux / macOS / Bash:
cp client/.env.example client/.env
```

**Key Client Environment Variables (`client/.env`):**

```env
VITE_SUPABASE_URL=https://mock-opspilot.supabase.co
VITE_SUPABASE_ANON_KEY=mock-anon-key-opspilot-2026
VITE_API_URL=http://localhost:5000/api
```

> [!CAUTION]
> **Frontend Security Rule:** Under **NO** circumstances should `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` ever be placed inside `client/.env`. The OpsPilot build tools and `scripts/check-env.js` will abort with an error if secret keys are detected in client files.

### Step 3.4: Verify Environment Health
Run the automated environment integrity validator:

```bash
npm run check:env
```

---

## 4. Dependency Installation

Install all dependencies across the monorepo, server, and client workspaces:

```bash
npm run install:all
```

Alternatively, you can install individually:

```bash
# 1. Monorepo root tooling (Playwright, ESLint, Prettier)
npm install

# 2. Backend server dependencies
cd server
npm install
cd ..

# 3. Frontend client dependencies
cd client
npm install
cd ..
```

---

## 5. Database Setup & Migrations

OpsPilot supports two local operating modes:

### Mode A: Zero-Dependency Mock Mode (Default - Instant)
No database installation is required. With `SUPABASE_URL=https://mock-opspilot.supabase.co` in `server/.env`, OpsPilot boots an in-memory transactional database seeded with:
- 2 Organizations (Acme Logistics Global, Apex Enterprises)
- 6 Role Personas (Owner, Admin, Manager, Employee, Technician, Customer)
- Projects, Kanban tasks, Work orders, Inventory, Invoices, and Audit logs.

To verify migration SQL file syntax without a live database:
```bash
npm run migrate
```

### Mode B: Live Local PostgreSQL via Supabase CLI (Optional)
If you have Docker and the Supabase CLI installed, you can spin up the full Supabase local stack:

```bash
# 1. Start local Supabase containers (PostgreSQL, Auth, Storage, Studio)
npm run db:start

# 2. Apply all 14 sequential migrations
npm run db:migrate

# 3. Seed demo accounts and operational data
npm run db:seed
```

To inspect your local database, open Supabase Studio at: `http://localhost:54323`.

---

## 6. Starting the Application

### Option 1: Unified Development Mode (Recommended)
Launch both backend and frontend concurrently with a single command:

```bash
npm run dev
```

This invokes `scripts/dev.js`, starting:
- **Backend API Server** on `http://localhost:5000` (with live reload via `nodemon`)
- **Frontend Client** on `http://localhost:5173` (with hot module replacement via `Vite`)

### Option 2: Running Server & Client in Separate Terminals

**Terminal 1 (Backend Server):**
```bash
npm run dev:server
```
*(Or `cd server && npm run dev`)*

**Terminal 2 (Frontend Client):**
```bash
npm run dev:client
```
*(Or `cd client && npm run dev`)*

### Option 3: Full Stack via Docker Compose
To run OpsPilot in isolated Docker containers:

```bash
docker compose up --build
```

---

## 7. Localhost Endpoints & Access URLs

Once running, the following services and endpoints are accessible:

| Service / Interface | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Web Application** | [http://localhost:5173](http://localhost:5173) | Primary React 19 Single Page Application |
| **Backend API Base (v1)** | [http://localhost:5000/api/v1](http://localhost:5000/api/v1) | Primary versioned REST API |
| **API Healthcheck** | [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health) | Operational status and feature flags |
| **Kubernetes Liveness Probe** | [http://localhost:5000/api/v1/health/liveness](http://localhost:5000/api/v1/health/liveness) | Fast liveness probe (`{"data":{"status":"alive"}}`) |
| **Kubernetes Readiness Probe** | [http://localhost:5000/api/v1/health/readiness](http://localhost:5000/api/v1/health/readiness) | Deep database and cache connectivity check |
| **Interactive API Documentation** | [http://localhost:5000/api/v1/docs/](http://localhost:5000/api/v1/docs/) | Swagger UI / OpenAPI 3.0 interactive specification |
| **Socket.IO Server** | `ws://localhost:5000/socket.io` | Authenticated real-time WebSocket connection |
| **Supabase Studio** *(If Mode B)* | [http://localhost:54323](http://localhost:54323) | Local database management GUI |
| **Docker Client** *(If Docker Compose)* | [http://localhost](http://localhost) | Nginx frontend container on port 80 |

---

## 8. Stopping and Restarting

### How to Stop the Application
- **Unified Dev Mode (`npm run dev`):** Press `Ctrl + C` in the active terminal. The launcher cleanly terminates both backend and frontend child processes.
- **Separate Terminals:** Press `Ctrl + C` in both the server and client terminal windows.
- **Docker Compose:** Run:
  ```bash
  docker compose down
  ```
- **Supabase Local Stack:** Run:
  ```bash
  npm run db:stop
  ```

### How to Restart the Application
- After pulling new changes or modifying `.env`:
  ```bash
  # Check environment
  npm run check:env

  # Restart dev processes
  npm run dev
  ```
- If port 5000 or 5173 remains occupied after an abrupt termination, kill the orphaned processes (see [TROUBLESHOOTING.md](file:///c:/Downloads/OpsPilot/docs/TROUBLESHOOTING.md)).

---

## 9. Quick Verification Checklist

After starting OpsPilot, verify basic operational health:

1. Open [http://localhost:5173](http://localhost:5173) in your web browser. The OpsPilot landing page should appear.
2. Click **"Sign In"** in the top navigation.
3. On the login screen, click one of the **1-Click Persona Login** buttons (e.g., *Alex Rivera - Owner*).
4. Verify you are redirected to the Owner Dashboard displaying metrics and navigation tabs.
5. In another terminal, run the smoke-test suite:
   ```bash
   npm run test:smoke
   ```
   All 8 production smoke-test checks should pass with latency `< 10ms`.
