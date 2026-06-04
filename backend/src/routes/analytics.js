import { Router } from 'express';
import { query } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);
router.use(requireRole('stockpile_operator', 'jetty_operator', 'analytics', 'admin'));

// GET /analytics/overview?from=&to=&jetty=
router.get('/overview', async (req, res) => {
  const { from, to, jetty } = req.query;

  const tripConds = ['status = $1'];
  const tripVals = ['completed'];
  let idx = 2;
  if (from)  { tripConds.push(`date >= $${idx++}`); tripVals.push(from); }
  if (to)    { tripConds.push(`date <= $${idx++}`); tripVals.push(to); }
  if (jetty) { tripConds.push(`jetty_destination = $${idx++}`); tripVals.push(jetty); }
  const tripWhere = tripConds.join(' and ');

  // Include in_transit + pending too for total hauled (netto_site_kg is set at CP2)
  const allTripConds = ['netto_site_kg is not null'];
  const allTripVals = [];
  let idx2 = 1;
  if (from)  { allTripConds.push(`date >= $${idx2++}`); allTripVals.push(from); }
  if (to)    { allTripConds.push(`date <= $${idx2++}`); allTripVals.push(to); }
  if (jetty) { allTripConds.push(`jetty_destination = $${idx2++}`); allTripVals.push(jetty); }
  const allTripWhere = allTripConds.join(' and ');

  const [hauling, byJettyHauling, byDate, bargeRows, byJettyBarge] = await Promise.all([
    // Total hauling summary
    query(
      `select
         count(*)::int                       as total_trips,
         coalesce(sum(netto_site_kg), 0)::bigint as total_netto_kg
       from trips
       where ${allTripWhere}`,
      allTripVals
    ),

    // Hauling by jetty
    query(
      `select
         jetty_destination                        as jetty,
         count(*)::int                            as trips,
         coalesce(sum(netto_site_kg), 0)::bigint  as netto_kg,
         coalesce(sum(netto_jetty_kg), 0)::bigint as netto_jetty_kg
       from trips
       where ${allTripWhere}
       group by jetty_destination`,
      allTripVals
    ),

    // Daily breakdown
    query(
      `select
         date::text,
         count(*)::int                       as trips,
         coalesce(sum(netto_site_kg), 0)::bigint as netto_kg
       from trips
       where ${allTripWhere}
       group by date
       order by date asc`,
      allTripVals
    ),

    // Barge loading total
    query(
      `select coalesce(sum(loading_qty_kg), 0)::bigint as total_qty_kg, count(*)::int as total_loadings
       from barge_loadings
       where true
         ${from  ? `and loading_date >= '${from}'` : ''}
         ${to    ? `and loading_date <= '${to}'`   : ''}
         ${jetty ? `and jetty = '${jetty}'`        : ''}`,
      []
    ),

    // Barge loading by jetty
    query(
      `select jetty,
         coalesce(sum(loading_qty_kg), 0)::bigint as qty_kg,
         count(*)::int                            as loadings
       from barge_loadings
       where true
         ${from  ? `and loading_date >= '${from}'` : ''}
         ${to    ? `and loading_date <= '${to}'`   : ''}
         ${jetty ? `and jetty = '${jetty}'`        : ''}
       group by jetty`,
      []
    ),
  ]);

  const totalHauled = Number(hauling[0]?.total_netto_kg ?? 0);
  const totalBarged = Number(bargeRows[0]?.total_qty_kg ?? 0);

  const haulingByJetty = {};
  byJettyHauling.forEach((r) => {
    haulingByJetty[r.jetty] = { trips: r.trips, netto_kg: Number(r.netto_kg), netto_jetty_kg: Number(r.netto_jetty_kg) };
  });

  const bargeByJetty = {};
  byJettyBarge.forEach((r) => {
    bargeByJetty[r.jetty] = { loadings: r.loadings, qty_kg: Number(r.qty_kg) };
  });

  res.json({
    hauling: {
      total_trips: hauling[0]?.total_trips ?? 0,
      total_netto_kg: totalHauled,
      by_jetty: haulingByJetty,
      by_date: byDate.map((d) => ({ ...d, netto_kg: Number(d.netto_kg) })),
    },
    barge: {
      total_loadings: bargeRows[0]?.total_loadings ?? 0,
      total_qty_kg: totalBarged,
      by_jetty: bargeByJetty,
    },
    balance: {
      total_kg: totalHauled - totalBarged,
      by_jetty: Object.fromEntries(
        ['hasnur', 'talenta'].map((j) => [
          j,
          (haulingByJetty[j]?.netto_kg ?? 0) - (bargeByJetty[j]?.qty_kg ?? 0),
        ])
      ),
    },
  });
});

// GET /analytics/monitoring?from=&to=&jetty=
router.get('/monitoring', async (req, res) => {
  const { from, to, jetty } = req.query;

  const conds = [];
  const vals = [];
  let idx = 1;
  if (from)  { conds.push(`date >= $${idx++}`); vals.push(from); }
  if (to)    { conds.push(`date <= $${idx++}`); vals.push(to); }
  if (jetty) { conds.push(`jetty_destination = $${idx++}`); vals.push(jetty); }
  const extra = conds.length ? `and ${conds.join(' and ')}` : '';

  const [deviationBreaches, slaCP1CP2, slaCP2CP3, totals] = await Promise.all([
    // Deviation > 0.5% (only trips with CP3 data)
    query(
      `select
         trip_id, date::text, no_tiket, no_lambung, jetty_destination,
         netto_site_kg, netto_jetty_kg, deviasi_kg,
         round(abs(deviasi_kg::numeric / nullif(netto_site_kg, 0)) * 100, 2) as deviation_pct,
         cp3_timestamp
       from trips
       where netto_jetty_kg is not null
         and netto_site_kg  > 0
         and abs(deviasi_kg::numeric / netto_site_kg) > 0.005
         ${extra}
       order by abs(deviasi_kg::numeric / netto_site_kg) desc
       limit 100`,
      vals
    ),

    // CP1→CP2 > 30 minutes
    query(
      `select
         trip_id, date::text, no_tiket, no_lambung, jetty_destination,
         cp1_timestamp, cp2_timestamp,
         round(extract(epoch from (cp2_timestamp - cp1_timestamp)) / 60) as minutes_cp1_cp2
       from trips
       where cp1_timestamp is not null and cp2_timestamp is not null
         and extract(epoch from (cp2_timestamp - cp1_timestamp)) / 60 > 30
         ${extra}
       order by (cp2_timestamp - cp1_timestamp) desc
       limit 100`,
      vals
    ),

    // CP2→CP3 > 4 hours
    query(
      `select
         trip_id, date::text, no_tiket, no_lambung, jetty_destination,
         cp2_timestamp, cp3_timestamp,
         round(extract(epoch from (cp3_timestamp - cp2_timestamp)) / 3600, 1) as hours_cp2_cp3
       from trips
       where cp2_timestamp is not null and cp3_timestamp is not null
         and extract(epoch from (cp3_timestamp - cp2_timestamp)) / 3600 > 4
         ${extra}
       order by (cp3_timestamp - cp2_timestamp) desc
       limit 100`,
      vals
    ),

    // Totals for breach rate context
    query(
      `select
         count(*) filter (where cp1_timestamp is not null and cp2_timestamp is not null)::int as eligible_sla_cp1cp2,
         count(*) filter (where cp2_timestamp is not null and cp3_timestamp is not null)::int as eligible_sla_cp2cp3,
         count(*) filter (where netto_jetty_kg is not null and netto_site_kg > 0)::int        as eligible_deviation
       from trips
       where true ${extra}`,
      vals
    ),
  ]);

  res.json({
    deviation: {
      eligible: totals[0]?.eligible_deviation ?? 0,
      breaches: deviationBreaches.map((r) => ({ ...r, deviation_pct: Number(r.deviation_pct) })),
    },
    sla_cp1_cp2: {
      sla_minutes: 30,
      eligible: totals[0]?.eligible_sla_cp1cp2 ?? 0,
      breaches: slaCP1CP2.map((r) => ({ ...r, minutes_cp1_cp2: Number(r.minutes_cp1_cp2) })),
    },
    sla_cp2_cp3: {
      sla_hours: 4,
      eligible: totals[0]?.eligible_sla_cp2cp3 ?? 0,
      breaches: slaCP2CP3.map((r) => ({ ...r, hours_cp2_cp3: Number(r.hours_cp2_cp3) })),
    },
  });
});

export default router;
