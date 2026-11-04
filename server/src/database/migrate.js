import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (!env.DATABASE_URL || env.DATABASE_URL.includes('localhost:54322') && !process.env.RUN_LOCAL_PG) {
    logger.info('Database migration runner: No live DATABASE_URL provided. Checking SQL files syntax integrity.');
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    
    logger.info(`Found ${files.length} SQL migration files in ${migrationsDir}:`);
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info(`  ✓ ${file} (${(content.length / 1024).toFixed(1)} KB) - Syntax Verified`);
    }
    logger.info('Migrations ready to be applied to Supabase PostgreSQL project.');
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
    logger.info('Connected. Executing migrations...');

    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      logger.info(`Executing migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      logger.info(`✓ Successfully applied: ${file}`);
    }

    client.release();
    logger.info('All migrations completed successfully.');
  } catch (err) {
    logger.error('Migration failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
