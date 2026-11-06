# OpsPilot Production Rollback Runbook

> **Scope:** Incident recovery, version rollback, and disaster mitigation protocol for OpsPilot production deployments.  
> **Target Recovery Time (RTO):** < 5 minutes for application containers; < 15 minutes for database state.

---

## 1. Rollback Trigger Thresholds

A production rollback MUST be initiated immediately if any of the following automated monitoring alarms fire within 15 minutes post-deployment:

| Trigger Condition | Threshold | Detection Method |
| :--- | :--- | :--- |
| **HTTP 5xx Server Error Rate** | > 1.0% of total requests over 3 minutes | CloudWatch / Datadog / Sentry |
| **P99 API Latency** | > 1,500 ms sustained for 5 minutes | ALB / Nginx Access Logs |
| **Container Health Probe Failures** | > 2 restarts within 5 minutes on `/api/v1/health/liveness` | Kubernetes / ECS Container Alarms |
| **Database Pool Exhaustion** | Active connections > 90% of pool limit | Supabase Metrics / PgBouncer |
| **Data Integrity Fault** | Unhandled database constraint or RLS leak | Smoke-test audit / Sentry alert |

---

## 2. Pre-Deployment Snapshot Checklist

Before executing ANY production release:
1. Note the current git commit SHA:
   ```bash
   PREV_STABLE_SHA=$(git rev-parse HEAD)
   echo "Current Stable Release: $PREV_STABLE_SHA"
   ```
2. Note the latest applied database migration version:
   ```sql
   SELECT version, applied_at FROM public._schema_migrations ORDER BY applied_at DESC LIMIT 1;
   ```
3. Verify that Supabase Point-in-Time Recovery (PITR) is healthy and record the current wall-clock UTC timestamp:
   ```bash
   date -u +"%Y-%m-%d %H:%M:%S UTC"
   ```

---

## 3. Rollback Execution Procedures

### 3.1 Procedure 1: Frontend Client Rollback (< 2 minutes)

Because the frontend is decoupled and stateless, frontend rollback is instant:

#### If deployed on Vercel / Netlify:
1. Open Vercel / Netlify Dashboard.
2. Navigate to **Deployments**.
3. Locate the previous production deployment (`PREV_STABLE_SHA`).
4. Click **Instant Rollback / Promote to Production**.
5. Purge Edge Cache across all global PoPs.

#### If deployed via Docker / Nginx:
```bash
# Shift traffic back to previous container image tag
docker stop opspilot-client-current
docker run -d --name opspilot-client-prev -p 80:80 opspilot-client:$PREV_STABLE_SHA
```

---

### 3.2 Procedure 2: Backend API Container Rollback (< 3 minutes)

#### Kubernetes Deployment:
```bash
# Instantly roll back deployment to previous revision
kubectl rollout undo deployment/opspilot-server -n production

# Monitor status of rolling replacement
kubectl rollout status deployment/opspilot-server -n production
```

#### AWS ECS / Fargate:
```bash
# Update service to use previous task definition revision (e.g. revision 42 -> 41)
aws ecs update-service \
  --cluster opspilot-cluster \
  --service opspilot-server-service \
  --task-definition opspilot-server:41 \
  --force-new-deployment
```

#### Docker Compose / PaaS:
```bash
# Pull and restart previous stable container tag
export SERVER_IMAGE_TAG=$PREV_STABLE_SHA
docker-compose up -d --no-deps server
```

---

### 3.3 Procedure 3: Database Rollback Protocol

#### Philosophy: Expand and Contract
OpsPilot schema migrations follow the **Expand and Contract** pattern:
- New columns are added as `NULLABLE` or with default values.
- Columns are never renamed or deleted in the same release.
- Updatable views (`009_expenses_and_approvals.sql`, etc.) preserve backwards compatibility.

Therefore, reverting the backend container code to `PREV_STABLE_SHA` will function cleanly without requiring an emergency database rollback.

#### When Schema Rollback is Strictly Required:
If a migration introduced an invalid constraint or index lock:
1. Connect via direct PostgreSQL connection:
   ```bash
   psql "$DATABASE_URL"
   ```
2. Revert the specific offending statement or drop the newly added constraint:
   ```sql
   BEGIN;
   -- Example: Drop problematic index or constraint
   ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS chk_inventory_new_rule;
   DELETE FROM public._schema_migrations WHERE version = '014_problematic_migration.sql';
   COMMIT;
   ```

#### Worst-Case Disaster Recovery (PITR Restoration):
If catastrophic data corruption occurred:
1. In Supabase Dashboard, navigate to **Database** -> **Backups** -> **Point in Time**.
2. Select the pre-deployment timestamp recorded in Step 2.
3. Click **Restore to New Project** (or in-place restore if approved by Tech Lead).
4. Point `DATABASE_URL` to the restored instance.

---

### 3.4 Procedure 4: Redis Queue & Background Workers Rollback

If queued jobs are failing due to a buggy job payload:
```bash
# 1. Stop background processing worker
# 2. Inspect failed jobs via BullMQ API or CLI
curl -X GET https://api.opspilot.com/api/v1/automations/queue/jobs \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"

# 3. Clean active deduplication cooldown keys if false positives occurred
curl -X POST https://api.opspilot.com/api/v1/automations/deduplication/reset \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

---

## 4. Post-Rollback Smoke Verification

Immediately following rollback, run the automated verification suite against production:

```bash
# Run automated smoke test
node scripts/smoke-test.js https://api.opspilot.com

# Verify database RLS policies remain intact
node scripts/verify-rls.js
```

Both commands must exit with code `0`.

---

## 5. Incident Post-Mortem Template

Every rollback requires an incident review within 24 hours:
- **Incident Summary:** Description of outage or symptoms.
- **Root Cause Analysis (5 Whys):** Technical mechanism of failure.
- **Detection Time & Rollback Duration:** Total downtime duration.
- **Preventative Measures:** CI test additions or architectural guards.
