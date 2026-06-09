import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);

function witaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// GET /sessions — list sessions with trip counts
router.get('/', requireRole('admin', 'analytics', 'stockpile_operator'), async (_req, res) => {
  const rows = await query(`
    select s.*,
      count(t.trip_id)::int            as trip_count,
      coalesce(sum(t.netto_site_kg), 0)::bigint as total_netto_kg
    from sessions s
    left join trips t on t.session_id = s.session_id
    group by s.session_id
    order by s.session_date desc
  `);
  res.json(rows);
});

// GET /sessions/today — get today's session (active or ended)
router.get('/today', requireRole('admin', 'analytics', 'stockpile_operator'), async (_req, res) => {
  const today = witaDate();
  const session = await queryOne(`
    select s.*,
      count(t.trip_id)::int            as trip_count,
      coalesce(sum(t.netto_site_kg), 0)::bigint as total_netto_kg
    from sessions s
    left join trips t on t.session_id = s.session_id
    where s.session_date = $1
    group by s.session_id
    order by s.created_at desc
    limit 1
  `, [today]);
  res.json(session || null);
});

// PATCH /sessions/:id/end — end a session
router.patch('/:id/end', requireRole('stockpile_operator', 'admin'), async (req, res) => {
  const { id } = req.params;
  const session = await queryOne('select * from sessions where session_id = $1', [id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status === 'ended') return res.status(409).json({ error: 'Session is already ended' });

  const [updated] = await query(
    `update sessions set status = 'ended', ended_at = now() where session_id = $1 returning *`,
    [id]
  );
  res.json(updated);
});

// PATCH /sessions/:id/lock-site — toggle site data lock (admin only)
router.patch('/:id/lock-site', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const session = await queryOne('select * from sessions where session_id = $1', [id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const locking = !session.site_locked;
  const [updated] = await query(
    `update sessions
     set site_locked = $1, site_locked_at = $2
     where session_id = $3
     returning *`,
    [locking, locking ? new Date() : null, id]
  );
  res.json(updated);
});

// PATCH /sessions/:id/lock-jetty — toggle jetty data lock (admin only)
router.patch('/:id/lock-jetty', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const session = await queryOne('select * from sessions where session_id = $1', [id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const locking = !session.jetty_locked;
  const [updated] = await query(
    `update sessions
     set jetty_locked = $1, jetty_locked_at = $2
     where session_id = $3
     returning *`,
    [locking, locking ? new Date() : null, id]
  );
  res.json(updated);
});

export default router;
