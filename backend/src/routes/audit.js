import { Router } from 'express';
import { query } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);
router.use(requireRole('admin', 'supervisor'));

// GET /audit?record_id=&limit=50&offset=0
router.get('/', async (req, res) => {
  const { record_id, limit = 100, offset = 0 } = req.query;

  const conds = [];
  const vals = [];
  let idx = 1;

  if (record_id) {
    conds.push(`record_id = $${idx++}`);
    vals.push(record_id);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(Number(limit), Number(offset));

  const rows = await query(
    `SELECT * FROM audit_log ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    vals
  );

  res.json(rows);
});

export default router;
