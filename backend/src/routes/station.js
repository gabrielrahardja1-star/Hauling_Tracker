import { Router } from 'express';
import { query, queryOne } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireStationKey } from '../middleware/stationAuth.js';
import { logAudit } from '../lib/audit.js';
import { logError } from '../lib/errorLog.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireStationKey);

function witaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// POST /station/errors — weighbridge station reports a local problem (print
// failure, scale disconnect, a backend push that ultimately failed) so it's
// visible in Admin without needing physical/remote access to the station PC.
router.post('/errors', async (req, res) => {
  const { message, level, context } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  await logError({ source: 'station', level: level === 'warn' ? 'warn' : 'error', message, context });
  res.status(201).json({ ok: true });
});

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

// GET /station/trips/lookup?no_lambung= — find the plate's currently
// in-flight trip (awaiting CP2) for today. Lets the station recover a
// trip_id it lost track of (e.g. restart between weighing #1 and #2) before
// completing CP2. Filtered to status='pending' specifically — a plate can
// have MULTIPLE trips on the same day (a truck doing 2-3 loads), so this
// must find the one still awaiting departure, not just "any" trip today.
router.get('/trips/lookup', async (req, res) => {
  const { no_lambung } = req.query;
  if (!no_lambung) return res.status(400).json({ error: 'no_lambung is required' });

  const today = witaDate();
  const trip = await queryOne(
    `select * from trips where date = $1 and no_lambung = $2 and status = 'pending'
     order by cp1_timestamp desc limit 1`,
    [today, no_lambung.trim().toUpperCase()]
  );
  if (!trip) return res.status(404).json({ error: 'No trip awaiting CP2 found for this truck today' });
  res.json(trip);
});

// POST /station/trips — weighing #1 (tare): station creates a real CP1 trip
// directly, with no operator step in the app. Mirrors POST /trips in
// trips.js, but the station supplies jetty/coal/weather itself (collected on
// its own form) instead of an operator filling them in the app.
router.post('/trips', async (req, res) => {
  const { no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, measured_at } = req.body;

  if (!no_lambung || !jetty_destination || !coal_quality || !cuaca_mmi || tare_site_kg == null) {
    return res.status(400).json({ error: 'no_lambung, jetty_destination, coal_quality, cuaca_mmi, and tare_site_kg are required' });
  }
  if (tare_site_kg < 0) {
    return res.status(400).json({ error: 'tare_site_kg must not be negative' });
  }

  const today = witaDate();
  const lambung = no_lambung.trim().toUpperCase();

  // Idempotency: a retry (e.g. after a timed-out-but-successful first
  // attempt) of the SAME weighing must return the existing trip rather than
  // creating a duplicate. But a plate can legitimately have multiple trips on
  // the same day (a truck doing 2-3 loads) — so "same request" is only true
  // if the existing trip is still 'pending' (awaiting CP2). Once a trip has
  // moved past pending, this plate's next weighing #1 is a genuinely new trip.
  const existing = await queryOne(
    `select * from trips where date = $1 and no_lambung = $2 and status = 'pending'
     order by cp1_timestamp desc limit 1`,
    [today, lambung]
  );
  if (existing) return res.status(200).json(existing);

  let session = await queryOne(
    `select session_id from sessions where session_date = $1 and status = 'active'`,
    [today]
  );
  if (!session) {
    session = await queryOne(
      `insert into sessions (session_date, status) values ($1, 'active') returning session_id`,
      [today]
    );
  }

  const [trip] = await query(
    `with next_ticket as (
       select coalesce(max(no_tiket), 0) + 1 as no_tiket from trips where date = $1
     )
     insert into trips (date, no_tiket, no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, tare_source, cp1_timestamp, status, session_id)
     select $1, no_tiket, $2, $3, $4, $5, $6, 'scale', $7, 'pending', $8
     from next_ticket
     returning *`,
    [today, lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, measured_at || new Date().toISOString(), session.session_id]
  );

  await logAudit(req, 'cp1_entry_station', trip.trip_id, null, trip);
  res.status(201).json(trip);
});

// PATCH /station/trips/:id/cp2 — weighing #2 (gross): station completes the
// trip directly. Mirrors PATCH /trips/:id/cp2 in trips.js.
router.patch('/trips/:id/cp2', async (req, res) => {
  const { id } = req.params;
  const { gross_site_kg } = req.body;

  if (gross_site_kg == null || gross_site_kg < 0) {
    return res.status(400).json({ error: 'gross_site_kg is required and must not be negative' });
  }

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  // Idempotency: a retry after the trip was already completed should return
  // the current state rather than error.
  if (trip.status !== 'pending') return res.status(200).json(trip);

  if (trip.is_locked) return res.status(409).json({ error: 'Trip is locked and cannot be modified' });
  if (trip.session_id) {
    const sess = await queryOne('select site_locked from sessions where session_id = $1', [trip.session_id]);
    if (sess?.site_locked) return res.status(409).json({ error: 'Session site data is locked' });
  }

  const netto_site_kg = gross_site_kg - trip.tare_site_kg;

  const [updated] = await query(
    `update trips
     set gross_site_kg = $1, netto_site_kg = $2, gross_source = 'scale', cp2_timestamp = now(), status = 'in_transit'
     where trip_id = $3
     returning *`,
    [gross_site_kg, netto_site_kg, id]
  );

  await logAudit(req, 'cp2_entry_station', id, trip, updated);
  res.json(updated);
});

export default router;
