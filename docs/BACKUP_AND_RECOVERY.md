# OpsPilot Backup and Disaster Recovery Plan

> **Scope:** Multi-tenant database durability, document storage resilience, and rapid disaster restoration runbook.  
> **Recovery Targets:**
> - **Recovery Point Objective (RPO):** < 5 minutes (Maximum acceptable data loss)
> - **Recovery Time Objective (RTO):** < 30 minutes (Maximum acceptable restoration downtime)

---

## 1. Resilience & Durability Architecture

OpsPilot data assets are categorized into three core tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA ASSET TIERS                                │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│ Tier 1: Relational DB    │ Tier 2: Storage Buckets  │ Tier 3: Redis Cache   │
│ (32 PostgreSQL Tables)   │ (6 Storage Buckets)      │ (BullMQ Job States)   │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ • Supabase Continuous    │ • S3 Cross-Region        │ • Ephemeral job state │
│   WAL Archiving (PITR)   │   Replication (CRR)      │ • Redis AOF (Append   │
│ • Daily Automated Offsite│ • Object Versioning      │   Only File)          │
│   Logical pg_dump        │ • Multi-AZ Durability    │ • Self-healing jobs   │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. PostgreSQL Backup Procedures

### 2.1 Continuous Point-in-Time Recovery (PITR)

- Supabase Pro/Enterprise projects automatically stream Write-Ahead Logs (WAL) continuously to encrypted storage.
- Enables granular restoration to any millisecond within the past 7 to 30 days.
- Fully protects against catastrophic manual mistakes, malicious updates, or ransomware.

### 2.2 Automated Daily Offsite Logical Backup (`pg_dump`)

In addition to managed PITR, OpsPilot runs an independent daily logical export stored in an isolated, immutable cloud bucket (AWS S3 with Object Lock or Google Cloud Storage).

#### Backup Automation Script (`scripts/backup-db.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="/var/backups/opspilot"
BACKUP_FILE="${BACKUP_DIR}/opspilot_dump_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://opspilot-dr-backups-vault/postgres"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u)] Initiating logical PostgreSQL backup..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip -c > "$BACKUP_FILE"

echo "[$(date -u)] Backup created (${BACKUP_FILE}). Uploading to encrypted vault..."
aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/" --sse aws:kms

echo "[$(date -u)] Backup successfully mirrored to offsite vault."
# Retain local backups for 7 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
```

---

## 3. Storage Bucket Disaster Recovery

OpsPilot manages 6 specialized storage buckets:
1. `org-assets` (Tenant logos and public branding)
2. `employee-documents` (Confidential workforce onboarding contracts)
3. `customer-documents` (Customer service attachments)
4. `task-attachments` (Engineering task collaboration files)
5. `expense-receipts` (Financial expense verification receipts)
6. `invoice-documents` (Generated customer PDF invoices)

### Protection Policies:
- **Versioning Enabled:** Overwritten or deleted objects retain historic versions.
- **Cross-Region Replication (CRR):** S3 bucket replication synchronizes all assets from `us-east-1` to `eu-central-1` automatically within 15 minutes.
- **Path Isolation Invariant:** Bucket path pattern `[organization_id]/...` strictly enforced by storage RLS triggers.

---

## 4. Disaster Recovery Restoration Runbook

In the event of a total primary cloud region failure or database corruption:

### Step 1: Declare Disaster & Triage
1. Incident Commander confirms incident severity (SEV-1).
2. Triage team activates standby restoration environment.

### Step 2: Restore Relational Database

#### Method A: Supabase PITR Restore (Preferred)
1. Navigate to Supabase Dashboard -> **Database** -> **Backups**.
2. Select **Point in Time** restore.
3. Select exact timestamp immediately prior to corruption event (e.g., `2026-11-06 10:20:00 UTC`).
4. Click **Confirm Restore**. Supabase provisions a pristine restored instance.

#### Method B: Standalone `pg_restore` from S3 Vault
```bash
# 1. Download latest logical backup
aws s3 cp s3://opspilot-dr-backups-vault/postgres/opspilot_dump_LATEST.sql.gz ./latest_dump.sql.gz

# 2. Decompress archive
gzip -d ./latest_dump.sql.gz

# 3. Restore to standby PostgreSQL instance
pg_restore -d "$NEW_DATABASE_URL" \
  --clean \
  --if-exists \
  --exit-on-error \
  ./latest_dump.sql
```

### Step 3: Run Database Sanity & RLS Verification
Before pointing application traffic to the restored instance:

```bash
export DATABASE_URL="$NEW_DATABASE_URL"

# 1. Verify schema migrations state
node server/src/database/migrate.js

# 2. Verify Row Level Security across all 32 tables
node scripts/verify-rls.js
```

### Step 4: Application Traffic Re-pointing
1. Update `DATABASE_URL` and `DATABASE_POOLER_URL` secret variables in backend hosting.
2. Trigger rolling restart of backend API containers.
3. Run automated smoke tests:
   ```bash
   node scripts/smoke-test.js https://api.opspilot.com
   ```
4. Verify HTTP 200 OK across `/health`, `/api/v1/health`, `/api/v1/health/liveness`, and `/api/v1/health/readiness`.

---

## 5. Disaster Recovery Drill Schedule

To guarantee RTO and RPO guarantees, the following drills are mandated:

| Drill Type | Frequency | Target Objective |
| :--- | :--- | :--- |
| **Automated Backup Integrity Check** | Weekly (Automated) | Validates test restoration of latest `pg_dump` in sandbox. |
| **Point-In-Time Recovery Drill** | Bi-annually | Tests restoration of staging database using PITR within 20 mins. |
| **Cross-Region Failover Simulation** | Annually | Simulates total cloud region loss and DNS traffic diversion. |
