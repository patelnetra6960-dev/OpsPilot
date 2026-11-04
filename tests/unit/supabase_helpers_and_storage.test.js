import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_BUCKETS,
  validateStorageUpload,
  createSignedStorageUrl,
  withTenantScope,
  withPagination,
  handleSupabaseError,
  executeWithRetry,
  getAdminClient,
  getUserClient
} from '../../server/src/utils/supabaseHelpers.js';
import fs from 'fs';
import path from 'path';

describe('Prompt 11: Supabase Helpers & Storage Unit Test Suite', () => {
  const supaMigration013 = path.resolve('database/migrations/013_storage_buckets_and_rls.sql');
  const migrationSql = fs.readFileSync(supaMigration013, 'utf8');

  // -------------------------------------------------------------------
  // 1. Static Storage Configuration & Buckets Audit
  // -------------------------------------------------------------------
  describe('1. Storage Buckets Configuration & Migration Audit', () => {
    it('1.1 Verifies all 5 domain buckets (+ org-assets) are declared in SQL migration', () => {
      const requiredBuckets = [
        'org-documents',
        'customer-attachments',
        'project-files',
        'work-order-photos',
        'invoice-documents',
        'org-assets'
      ];

      for (const bucket of requiredBuckets) {
        assert.ok(
          migrationSql.includes(`'${bucket}'`),
          `Bucket '${bucket}' must be inserted into storage.buckets in migration 013`
        );
      }
    });

    it('1.2 Confirms storage RLS policies enforce tenant folder prefix: (storage.foldername(name))[1]::uuid', () => {
      assert.ok(
        migrationSql.includes('(storage.foldername(name))[1]::uuid'),
        'Storage policies must parse organization UUID from folder path prefix'
      );
      assert.ok(
        migrationSql.includes('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'),
        'RLS must be enabled on storage.objects'
      );
    });

    it('1.3 Confirms JavaScript STORAGE_BUCKETS constants match requirements', () => {
      assert.equal(STORAGE_BUCKETS.ORG_DOCUMENTS.id, 'org-documents');
      assert.equal(STORAGE_BUCKETS.ORG_DOCUMENTS.public, false);
      assert.equal(STORAGE_BUCKETS.ORG_DOCUMENTS.fileSizeLimit, 52428800); // 50MB

      assert.equal(STORAGE_BUCKETS.CUSTOMER_ATTACHMENTS.id, 'customer-attachments');
      assert.equal(STORAGE_BUCKETS.CUSTOMER_ATTACHMENTS.public, false);
      assert.equal(STORAGE_BUCKETS.CUSTOMER_ATTACHMENTS.fileSizeLimit, 26214400); // 25MB

      assert.equal(STORAGE_BUCKETS.PROJECT_FILES.id, 'project-files');
      assert.equal(STORAGE_BUCKETS.PROJECT_FILES.public, false);
      assert.equal(STORAGE_BUCKETS.PROJECT_FILES.fileSizeLimit, 104857600); // 100MB

      assert.equal(STORAGE_BUCKETS.WORK_ORDER_PHOTOS.id, 'work-order-photos');
      assert.equal(STORAGE_BUCKETS.WORK_ORDER_PHOTOS.public, false);
      assert.equal(STORAGE_BUCKETS.WORK_ORDER_PHOTOS.fileSizeLimit, 26214400); // 25MB

      assert.equal(STORAGE_BUCKETS.INVOICE_DOCUMENTS.id, 'invoice-documents');
      assert.equal(STORAGE_BUCKETS.INVOICE_DOCUMENTS.public, false);
      assert.equal(STORAGE_BUCKETS.INVOICE_DOCUMENTS.fileSizeLimit, 15728640); // 15MB
    });

    it('1.4 Confirms getAdminClient and getUserClient client accessor functions exist and execute safely', () => {
      const adminClient = getAdminClient();
      assert.ok(adminClient === null || typeof adminClient === 'object');
      const userClient = getUserClient('mock-user-token');
      assert.ok(userClient === null || typeof userClient === 'object');
    });
  });

  // -------------------------------------------------------------------
  // 2. Storage Upload Validation Helper
  // -------------------------------------------------------------------
  describe('2. Storage Upload Validation', () => {
    it('2.1 Validates permissible file upload (PDF into org-documents)', () => {
      const result = validateStorageUpload({
        bucket: 'org-documents',
        fileName: 'operations-handbook-2026.pdf',
        fileSize: 1024 * 1024 * 5, // 5MB
        mimeType: 'application/pdf'
      });

      assert.equal(result.isValid, true);
      assert.ok(result.bucketConfig);
    });

    it('2.2 Rejects unauthorized bucket name', () => {
      const result = validateStorageUpload({
        bucket: 'unauthorized-bucket',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      });

      assert.equal(result.isValid, false);
      assert.equal(result.code, 'INVALID_STORAGE_BUCKET');
    });

    it('2.3 Rejects file exceeding bucket size limit (e.g. >50MB in org-documents)', () => {
      const result = validateStorageUpload({
        bucket: 'org-documents',
        fileName: 'huge-file.pdf',
        fileSize: 1024 * 1024 * 60, // 60MB
        mimeType: 'application/pdf'
      });

      assert.equal(result.isValid, false);
      assert.equal(result.code, 'FILE_SIZE_LIMIT_EXCEEDED');
    });

    it('2.4 Rejects invalid MIME type (e.g. video/mp4 in invoice-documents)', () => {
      const result = validateStorageUpload({
        bucket: 'invoice-documents',
        fileName: 'billing-video.mp4',
        fileSize: 1024 * 1024,
        mimeType: 'video/mp4'
      });

      assert.equal(result.isValid, false);
      assert.equal(result.code, 'INVALID_MIME_TYPE');
    });

    it('2.5 Rejects path traversal attempts in file names (e.g. ../../etc/passwd)', () => {
      const result = validateStorageUpload({
        bucket: 'org-documents',
        fileName: '../../etc/passwd',
        fileSize: 1024,
        mimeType: 'application/pdf'
      });

      assert.equal(result.isValid, false);
      assert.equal(result.code, 'INVALID_FILE_NAME');
    });
  });

  // -------------------------------------------------------------------
  // 3. Query Scoping & Pagination Helpers
  // -------------------------------------------------------------------
  describe('3. Query Scoping & Pagination Database Helpers', () => {
    it('3.1 withTenantScope: Correctly chains organization_id and deleted_at', () => {
      const mockQuery = {
        filters: {},
        eq(col, val) {
          this.filters[col] = val;
          return this;
        },
        is(col, val) {
          this.filters[col] = val;
          return this;
        }
      };

      withTenantScope(mockQuery, 'org-uuid-1234');
      assert.equal(mockQuery.filters.organization_id, 'org-uuid-1234');
      assert.equal(mockQuery.filters.deleted_at, null);
    });

    it('3.2 withPagination: Correctly computes offsets and sorting', () => {
      const mockQuery = {
        ordering: null,
        rangeLimits: null,
        order(col, opts) {
          this.ordering = { col, opts };
          return this;
        },
        range(from, to) {
          this.rangeLimits = { from, to };
          return this;
        }
      };

      withPagination(mockQuery, { page: 3, limit: 10, sortBy: 'total', sortOrder: 'asc' });

      // Page 3, limit 10 => from: 20, to: 29
      assert.deepEqual(mockQuery.rangeLimits, { from: 20, to: 29 });
      assert.equal(mockQuery.ordering.col, 'total');
      assert.equal(mockQuery.ordering.opts.ascending, true);
    });
  });

  // -------------------------------------------------------------------
  // 4. Supabase Error Translation Helper
  // -------------------------------------------------------------------
  describe('4. Supabase Error Translation', () => {
    it('4.1 Maps PostgreSQL code 23505 to 409 Conflict', () => {
      const err = { code: '23505', detail: 'Key (email)=(alex@acme.com) already exists.' };
      const translated = handleSupabaseError(err);
      assert.equal(translated.status, 409);
      assert.equal(translated.code, 'CONFLICT_DUPLICATE_RECORD');
    });

    it('4.2 Maps PostgreSQL code 42501 to 403 Forbidden', () => {
      const err = { code: '42501', message: 'new row violates row-level security policy' };
      const translated = handleSupabaseError(err);
      assert.equal(translated.status, 403);
      assert.equal(translated.code, 'FORBIDDEN_RLS_VIOLATION');
    });

    it('4.3 Maps PGRST116 to 404 Not Found', () => {
      const err = {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned'
      };
      const translated = handleSupabaseError(err);
      assert.equal(translated.status, 404);
      assert.equal(translated.code, 'NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------
  // 5. Signed URL Generation & Retry Resilience
  // -------------------------------------------------------------------
  describe('5. Signed URL Generation & Resilience', () => {
    it('5.1 createSignedStorageUrl generates deterministic signed URLs with expiry', async () => {
      const result = await createSignedStorageUrl(
        'org-documents',
        '11111111-1111-1111-1111-111111111111/contracts/master-service-agreement.pdf',
        600
      );

      assert.ok(result.signedUrl);
      assert.ok(result.expiresAt);
      assert.ok(result.signedUrl.includes('token='));
      assert.ok(result.signedUrl.includes('org-documents'));
    });

    it('5.2 executeWithRetry retries on transient failures', async () => {
      let attempts = 0;
      const unreliableFn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('Transient network glitch');
        return 'success';
      };

      const result = await executeWithRetry(unreliableFn, 3, 10);
      assert.equal(result, 'success');
      assert.equal(attempts, 3);
    });
  });
});
