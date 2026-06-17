import { query } from './db.js';

export async function logAudit(req, action, recordId, oldData, newData) {
  try {
    await query(
      `INSERT INTO audit_log (user_id, user_email, action, record_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.user_id,
        req.user.email,
        action,
        String(recordId),
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
      ]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
