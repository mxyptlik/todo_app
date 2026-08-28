import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPool } from './pool.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const pool = createPool(databaseUrl);
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const dir = join(process.cwd(), 'db', 'migrations');
  for (const name of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort()) {
    const prior = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (prior.rowCount) continue;
    await pool.query('BEGIN');
    try { await pool.query(await readFile(join(dir, name), 'utf8')); await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]); await pool.query('COMMIT'); console.info(`Applied ${name}`); }
    catch (cause) { await pool.query('ROLLBACK'); throw cause; }
  }
} finally { await pool.end(); }
