/**
 * Applies any unapplied SQL migrations from supabase/migrations/ in order.
 *
 * Usage:
 *   POSTGRES_URL="postgres://..." node scripts/migrate.js
 *   -- or set POSTGRES_URL in .env --
 *
 * Tracks applied files in the schema_migrations table so re-running is safe.
 */

import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../supabase/migrations');

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url || !url.startsWith('postgres')) {
  console.error('Set POSTGRES_URL (e.g. postgres://user:pass@host:5432/db) in your .env or environment');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function run() {
  const client = await pool.connect();
  try {
    // Create tracking table if it doesn't exist
    await client.query(`
      create table if not exists schema_migrations (
        filename   text        primary key,
        applied_at timestamptz not null default now()
      )
    `);

    // Load already-applied migrations
    const { rows: applied } = await client.query('select filename from schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.filename));

    // Read migration files sorted by name (001_, 002_, etc.)
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('Nothing to migrate — all migrations already applied.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`  Applying ${file} ... `);
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
        console.log('done');
      } catch (err) {
        await client.query('rollback');
        console.error(`FAILED\n\n  Error: ${err.message}\n`);
        console.error('Migration aborted. Fix the error and re-run.');
        process.exit(1);
      }
    }

    console.log('\nAll migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

run();
