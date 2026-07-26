import { Router } from 'express';
import { query } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logError } from '../lib/errorLog.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);

// POST /errors — any logged-in user's browser reports a crash/error. Source
// is always 'frontend' here — a separate station-key-authed route handles
// station-reported errors (see routes/station.js).
router.post('/', async (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  await logError({
    source: 'frontend',
    level: 'error',
    message,
    context: { ...context, user_email: req.user.email, path: context?.path },
  });
  res.status(201).json({ ok: true });
});

// GET /errors?source=&limit=&offset= — admin/supervisor only
router.get('/', requireRole('admin', 'supervisor'), async (req, res) => {
  const { source, limit = 200, offset = 0 } = req.query;

  const conds = [];
  const vals = [];
  let idx = 1;

  if (source) {
    conds.push(`source = $${idx++}`);
    vals.push(source);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(Number(limit), Number(offset));

  const rows = await query(
    `SELECT * FROM error_log ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    vals
  );

  res.json(rows);
});

export default router;
