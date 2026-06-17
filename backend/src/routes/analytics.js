import { Router } from 'express';
import ExcelJS from 'exceljs';
import { query } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);
router.use(requireRole('stockpile_operator', 'jetty_operator', 'analytics', 'admin'));

function buildFilters(from, to, jetty, startIdx = 1) {
  const conds = [];
  const vals = [];
  let idx = startIdx;
  if (from)  { conds.push(`date >= $${idx++}`);                vals.push(from); }
  if (to)    { conds.push(`date <= $${idx++}`);                vals.push(to); }
  if (jetty) { conds.push(`jetty_destination = $${idx++}`);    vals.push(jetty); }
  return { extra: conds.length ? `AND ${conds.join(' AND ')}` : '', vals, nextIdx: idx };
}

function buildBargeFilters(from, to, jetty, startIdx = 1) {
  const conds = [];
  const vals = [];
  let idx = startIdx;
  if (from)  { conds.push(`loading_date >= $${idx++}`); vals.push(from); }
  if (to)    { conds.push(`loading_date <= $${idx++}`); vals.push(to); }
  if (jetty) { conds.push(`jetty = $${idx++}`);         vals.push(jetty); }
  return { extra: conds.length ? `AND ${conds.join(' AND ')}` : '', vals, nextIdx: idx };
}

// GET /analytics/overview?from=&to=&jetty=
router.get('/overview', async (req, res) => {
  const { from, to, jetty } = req.query;
  const { extra, vals } = buildFilters(from, to, jetty);
  const { extra: bargeExtra, vals: bargeVals } = buildBargeFilters(from, to, jetty);

  const [hauling, byJettyHauling, byDate, bargeRows, byJettyBarge] = await Promise.all([
    query(
      `SELECT count(*) AS total_trips, coalesce(sum(netto_site_kg), 0) AS total_netto_kg
       FROM trips
       WHERE netto_site_kg IS NOT NULL ${extra}`,
      vals
    ),

    query(
      `SELECT jetty_destination AS jetty,
         count(*) AS trips,
         coalesce(sum(netto_site_kg), 0) AS netto_kg,
         coalesce(sum(netto_jetty_kg), 0) AS netto_jetty_kg
       FROM trips
       WHERE netto_site_kg IS NOT NULL ${extra}
       GROUP BY jetty_destination`,
      vals
    ),

    query(
      `SELECT date::text AS date, count(*) AS trips,
         coalesce(sum(netto_site_kg), 0) AS netto_kg
       FROM trips
       WHERE netto_site_kg IS NOT NULL ${extra}
       GROUP BY date
       ORDER BY date ASC`,
      vals
    ),

    query(
      `SELECT coalesce(sum(loading_qty_kg), 0) AS total_qty_kg, count(*) AS total_loadings
       FROM barge_loadings
       WHERE 1=1 ${bargeExtra}`,
      bargeVals
    ),

    query(
      `SELECT jetty, coalesce(sum(loading_qty_kg), 0) AS qty_kg, count(*) AS loadings
       FROM barge_loadings
       WHERE 1=1 ${bargeExtra}
       GROUP BY jetty`,
      bargeVals
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
  const { extra, vals } = buildFilters(from, to, jetty);

  const [deviationBreaches, slaCP1CP2, slaCP2CP3, totals] = await Promise.all([
    query(
      `SELECT
         trip_id, date::text AS date, no_tiket, no_lambung, jetty_destination,
         netto_site_kg, netto_jetty_kg, deviasi_kg,
         ROUND(ABS(deviasi_kg::numeric / NULLIF(netto_site_kg, 0)) * 100, 2) AS deviation_pct,
         cp3_timestamp
       FROM trips
       WHERE netto_jetty_kg IS NOT NULL
         AND netto_site_kg > 0
         AND ABS(deviasi_kg::numeric / netto_site_kg) > 0.005
         ${extra}
       ORDER BY ABS(deviasi_kg::numeric / netto_site_kg) DESC
       LIMIT 100`,
      vals
    ),

    query(
      `SELECT
         trip_id, date::text AS date, no_tiket, no_lambung, jetty_destination,
         cp1_timestamp, cp2_timestamp,
         ROUND(EXTRACT(EPOCH FROM (cp2_timestamp - cp1_timestamp)) / 60) AS minutes_cp1_cp2
       FROM trips
       WHERE cp1_timestamp IS NOT NULL AND cp2_timestamp IS NOT NULL
         AND EXTRACT(EPOCH FROM (cp2_timestamp - cp1_timestamp)) / 60 > 30
         ${extra}
       ORDER BY (cp2_timestamp - cp1_timestamp) DESC
       LIMIT 100`,
      vals
    ),

    query(
      `SELECT
         trip_id, date::text AS date, no_tiket, no_lambung, jetty_destination,
         cp2_timestamp, cp3_timestamp,
         ROUND(EXTRACT(EPOCH FROM (cp3_timestamp - cp2_timestamp)) / 3600, 1) AS hours_cp2_cp3
       FROM trips
       WHERE cp2_timestamp IS NOT NULL AND cp3_timestamp IS NOT NULL
         AND EXTRACT(EPOCH FROM (cp3_timestamp - cp2_timestamp)) / 3600 > 4
         ${extra}
       ORDER BY (cp3_timestamp - cp2_timestamp) DESC
       LIMIT 100`,
      vals
    ),

    query(
      `SELECT
         COUNT(*) FILTER (WHERE cp1_timestamp IS NOT NULL AND cp2_timestamp IS NOT NULL) AS eligible_sla_cp1cp2,
         COUNT(*) FILTER (WHERE cp2_timestamp IS NOT NULL AND cp3_timestamp IS NOT NULL) AS eligible_sla_cp2cp3,
         COUNT(*) FILTER (WHERE netto_jetty_kg IS NOT NULL AND netto_site_kg > 0) AS eligible_deviation
       FROM trips
       WHERE 1=1 ${extra}`,
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

// GET /analytics/monitoring/export?from=&to=&jetty= — Excel for deviation breaches
router.get('/monitoring/export', async (req, res) => {
  const { from, to, jetty } = req.query;
  const { extra, vals } = buildFilters(from, to, jetty);

  const [deviationBreaches, slaBreaches] = await Promise.all([
    query(
      `SELECT trip_id, date::text AS date, no_tiket, no_lambung, jetty_destination,
         netto_site_kg, netto_jetty_kg, deviasi_kg,
         ROUND(ABS(deviasi_kg::numeric / NULLIF(netto_site_kg, 0)) * 100, 2) AS deviation_pct
       FROM trips
       WHERE netto_jetty_kg IS NOT NULL AND netto_site_kg > 0
         AND ABS(deviasi_kg::numeric / netto_site_kg) > 0.005
         ${extra}
       ORDER BY ABS(deviasi_kg::numeric / netto_site_kg) DESC`,
      vals
    ),
    query(
      `SELECT trip_id, date::text AS date, no_tiket, no_lambung, jetty_destination,
         cp2_timestamp, cp3_timestamp,
         ROUND(EXTRACT(EPOCH FROM (cp3_timestamp - cp2_timestamp)) / 3600, 1) AS hours_cp2_cp3
       FROM trips
       WHERE cp2_timestamp IS NOT NULL AND cp3_timestamp IS NOT NULL
         AND EXTRACT(EPOCH FROM (cp3_timestamp - cp2_timestamp)) / 3600 > 4
         ${extra}
       ORDER BY (cp3_timestamp - cp2_timestamp) DESC`,
      vals
    ),
  ]);

  const workbook = new ExcelJS.Workbook();
  const numFmt = '#,##0';
  const center = { horizontal: 'center', vertical: 'middle' };
  const right  = { horizontal: 'right',  vertical: 'middle' };

  const toHHMM = (ts) => {
    if (!ts) return '';
    return new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(11, 16);
  };

  const devSheet = workbook.addWorksheet('Deviasi > 0.5%');
  const devHeader = devSheet.addRow(['No.Tiket', 'Truk', 'Tanggal', 'Jetty', 'Netto Site (kg)', 'Netto Jetty (kg)', 'Deviasi (kg)', 'Deviasi %']);
  devHeader.font = { bold: true };
  devHeader.eachCell((c) => { c.alignment = center; });
  devSheet.views = [{ state: 'frozen', ySplit: 1 }];

  deviationBreaches.forEach((r) => {
    const row = devSheet.addRow([
      r.no_tiket, r.no_lambung, r.date,
      r.jetty_destination === 'hasnur' ? 'HBM' : 'Talenta',
      r.netto_site_kg, r.netto_jetty_kg, r.deviasi_kg,
      Number(r.deviation_pct),
    ]);
    [5, 6, 7].forEach((c) => { row.getCell(c).numFmt = numFmt; row.getCell(c).alignment = right; });
    row.getCell(8).numFmt = '0.00"%"';
    row.getCell(8).alignment = right;
    row.getCell(8).font = { color: { argb: 'FFCC0000' } };
  });
  [8, 14, 12, 12, 16, 16, 14, 10].forEach((w, i) => { devSheet.getColumn(i + 1).width = w; });

  const slaSheet = workbook.addWorksheet('SLA Transit > 4j');
  const slaHeader = slaSheet.addRow(['No.Tiket', 'Truk', 'Tanggal', 'Jetty', 'Keluar Site', 'Tiba Jetty', 'Durasi (jam)']);
  slaHeader.font = { bold: true };
  slaHeader.eachCell((c) => { c.alignment = center; });
  slaSheet.views = [{ state: 'frozen', ySplit: 1 }];

  slaBreaches.forEach((r) => {
    const row = slaSheet.addRow([
      r.no_tiket, r.no_lambung, r.date,
      r.jetty_destination === 'hasnur' ? 'HBM' : 'Talenta',
      toHHMM(r.cp2_timestamp), toHHMM(r.cp3_timestamp),
      Number(r.hours_cp2_cp3),
    ]);
    row.getCell(7).font = { color: { argb: 'FFB45309' } };
  });
  [8, 14, 12, 12, 14, 14, 12].forEach((w, i) => { slaSheet.getColumn(i + 1).width = w; });

  const label = from && to ? `${from}_${to}` : 'all';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=monitoring_${label}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
