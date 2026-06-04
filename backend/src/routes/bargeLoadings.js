import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);

// POST /barge-loadings — jetty operator or admin records a barge loading
router.post('/', requireRole('jetty_operator', 'admin'), async (req, res) => {
  const { jetty, barge_name, tug_boat_name, loading_date, loading_qty_kg } = req.body;

  if (!jetty || !barge_name || !tug_boat_name || !loading_date || !loading_qty_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (loading_qty_kg <= 0) {
    return res.status(400).json({ error: 'loading_qty_kg must be positive' });
  }

  const [loading] = await query(
    `insert into barge_loadings (jetty, barge_name, tug_boat_name, loading_date, loading_qty_kg)
     values ($1, $2, $3, $4, $5)
     returning *, loading_qty_kg::int as loading_qty_kg`,
    [jetty, barge_name.trim(), tug_boat_name.trim(), loading_date, loading_qty_kg]
  );

  res.status(201).json(loading);
});

// GET /barge-loadings?jetty=&from=&to= — list barge loadings
router.get('/', requireRole('jetty_operator', 'stockpile_operator', 'admin', 'analytics'), async (req, res) => {
  const { jetty, from, to } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (jetty)  { conditions.push(`jetty = $${idx++}`);         values.push(jetty); }
  if (from)   { conditions.push(`loading_date >= $${idx++}`); values.push(from); }
  if (to)     { conditions.push(`loading_date <= $${idx++}`); values.push(to); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const rows = await query(
    `select *, loading_qty_kg::int as loading_qty_kg from barge_loadings ${where} order by loading_date desc, created_at desc`,
    values
  );
  res.json(rows);
});

// DELETE /barge-loadings/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const existing = await queryOne('select loading_id from barge_loadings where loading_id = $1', [id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await query('delete from barge_loadings where loading_id = $1', [id]);
  res.status(204).end();
});

export default router;
