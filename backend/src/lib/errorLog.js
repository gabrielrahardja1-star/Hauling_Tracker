import { query } from './db.js';

// Best-effort: a failure to log an error must never itself crash the caller
// or mask the original error.
export async function logError({ source, level = 'error', message, context }) {
  try {
    await query(
      `insert into error_log (source, level, message, context) values ($1, $2, $3, $4)`,
      [source, level, String(message).slice(0, 2000), context ? JSON.stringify(context) : null]
    );
  } catch (err) {
    console.error('[errorLog] Failed to write error log:', err.message);
  }
}
