import { randomUUID } from 'crypto';
import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);

// POST /barge-loadings — jetty operator or admin records a barge loading
router.post('/', requireRole('jetty_operator', 'admin'), async (req, res) => {
  const { jetty, barge_name, tug_boat_name, loading_date, loading_qty_kg, stockpile_code } = req.body;

  if (!jetty || !barge_name || !tug_boat_name || !loading_date || !loading_qty_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (loading_qty_kg <= 0) {
    return res.status(400).json({ error: 'loading_qty_kg must be positive' });
  }

  const [loading] = await query(
    `INSERT INTO barge_loadings (loading_id, jetty, barge_name, tug_boat_name, loading_date, loading_qty_kg, stockpile_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      randomUUID(),
      jetty,
      barge_name.trim(),
      tug_boat_name.trim(),
      loading_date,
      Number(loading_qty_kg),
      (stockpile_code || '').trim(),
    ]
  );

  res.status(201).json(loading);
});

// GET /barge-loadings?jetty=&from=&to= — list barge loadings
router.get('/', requireRole('jetty_operator', 'stockpile_operator', 'admin', 'analytics'), async (req, res) => {
  const { jetty, from, to } = req.query;

  const conds = [];
  const vals = [];
  let idx = 1;
  if (jetty) { conds.push(`jetty = $${idx++}`);         vals.push(jetty); }
  if (from)  { conds.push(`loading_date >= $${idx++}`); vals.push(from); }
  if (to)    { conds.push(`loading_date <= $${idx++}`); vals.push(to); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = await query(
    `SELECT * FROM barge_loadings ${where} ORDER BY loading_date DESC, created_at DESC`,
    vals
  );
  res.json(rows);
});

// DELETE /barge-loadings/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const existing = await queryOne(
    `SELECT loading_id FROM barge_loadings WHERE loading_id = $1`,
    [id]
  );
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await query(`DELETE FROM barge_loadings WHERE loading_id = $1`, [id]);
  res.status(204).end();
});

export default router;
