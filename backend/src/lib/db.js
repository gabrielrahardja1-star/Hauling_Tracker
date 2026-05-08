import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Convenience helper — returns rows directly
export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Returns the first row or null
export async function queryOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] ?? null;
}
