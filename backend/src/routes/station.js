import { Router } from 'express';
import { query } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireStationKey } from '../middleware/stationAuth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireStationKey);

// POST /station/readings — weighbridge station reports a completed weighing
router.post('/readings', async (req, res) => {
  const { no_lambung, weight_kg, reading_type, measured_at } = req.body;

  if (!no_lambung || weight_kg == null || !reading_type || !measured_at) {
    return res.status(400).json({ error: 'no_lambung, weight_kg, reading_type, and measured_at are required' });
  }
  if (!['tare', 'gross'].includes(reading_type)) {
    return res.status(400).json({ error: "reading_type must be 'tare' or 'gross'" });
  }
  if (weight_kg < 0) {
    return res.status(400).json({ error: 'weight_kg must not be negative' });
  }

  const lambung = no_lambung.trim().toUpperCase();

  const [reading] = await query(
    `insert into scale_readings_pending (no_lambung, reading_type, weight_kg, measured_at)
     values ($1, $2, $3, $4)
     on conflict (no_lambung, reading_type)
     do update set weight_kg = excluded.weight_kg, measured_at = excluded.measured_at, created_at = now()
     returning *`,
    [lambung, reading_type, weight_kg, measured_at]
  );

  await logAudit(req, 'station_reading', lambung, null, reading);
  res.status(201).json(reading);
});

export default router;
