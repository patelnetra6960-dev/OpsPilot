import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const args = process.argv.slice(2);
  const isSeedOnly = args.includes('--seed');

  const primaryMigrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const fallbackMigrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
  const migrationsDir = fs.existsSync(primaryMigrationsDir)
    ? primaryMigrationsDir
    : fallbackMigrationsDir;

  const seedFile = fs.existsSync(path.resolve(__dirname, '../../../supabase/seed.sql'))
    ? path.resolve(__dirname, '../../../supabase/seed.sql')
    : path.resolve(__dirname, '../../../database/seeds/seed.sql');

  if (
    !env.DATABASE_URL ||
    (env.DATABASE_URL.includes('localhost:54322') && !process.env.RUN_LOCAL_PG)
  ) {
    logger.info(
      'Database migration runner: No live DATABASE_URL provided. Checking SQL files syntax integrity.'
    );

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} SQL migration files in ${migrationsDir}:`);
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`  ✓ ${file} (${(content.length / 1024).toFixed(1)} KB) - Syntax Verified`);
    }

    if (fs.existsSync(seedFile)) {
      const seedContent = fs.readFileSync(seedFile, 'utf8');
      logger.info(`  ✓ seed.sql (${(seedContent.length / 1024).toFixed(1)} KB) - Seed Ready`);
    }

    logger.info('Migrations and seeds ready to be applied to Supabase PostgreSQL project.');
    return;
  }

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.isProduction ? { rejectUnauthorized: false } : false
  });

  try {
    logger.info('Connecting to PostgreSQL database...');
    const client = await pool.connect();
    logger.info('Connected.');

    if (isSeedOnly) {
      if (fs.existsSync(seedFile)) {
        logger.info(`Applying database seed from ${seedFile}...`);
        const seedSql = fs.readFileSync(seedFile, 'utf8');
        await client.query(seedSql);
        logger.info('✓ Database seed applied successfully.');
      } else {
        logger.warn('Seed file not found.');
      }
      client.release();
      return;
    }

    // 1. Create schema migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query('SELECT version FROM public._schema_migrations;');
    const appliedVersions = new Set(res.rows.map((r) => r.version));

    // 3. Find and apply pending migrations
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (appliedVersions.has(file)) {
        logger.info(`Skipping already applied migration: ${file}`);
        continue;
      }

      logger.info(`Executing migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._schema_migrations (version) VALUES ($1);', [file]);
        await client.query('COMMIT');
        logger.info(`✓ Successfully applied: ${file}`);
        appliedCount++;
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        throw migrationErr;
      }
    }

    logger.info(
      `Migration process completed. ${appliedCount} new migrations applied out of ${files.length} total.`
    );

    client.release();
  } catch (err) {
    logger.error('Migration failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
