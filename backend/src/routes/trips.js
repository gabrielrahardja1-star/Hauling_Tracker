import { Router } from 'express';
import ExcelJS from 'exceljs';
import { query, queryOne } from '../lib/db.js';
import { wrapAsyncRoutes } from '../lib/asyncRouter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();
wrapAsyncRoutes(router);
router.use(requireAuth);

function witaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// POST /trips — CP1: stockpile operator records truck arrival
router.post('/', requireRole('stockpile_operator', 'admin', 'supervisor'), async (req, res) => {
  const { no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg } = req.body;

  if (!no_lambung || !jetty_destination || !coal_quality || !cuaca_mmi || !tare_site_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (tare_site_kg <= 0) {
    return res.status(400).json({ error: 'tare_site_kg must be positive' });
  }

  const today = witaDate();
  const lambung = no_lambung.trim().toUpperCase();

  // Find or create an active session for today (auto-grouped by date)
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
     insert into trips (date, no_tiket, no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, cp1_timestamp, status, session_id)
     select $1, no_tiket, $2, $3, $4, $5, $6, now(), 'pending', $7
     from next_ticket
     returning *`,
    [today, lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, session.session_id]
  );

  await logAudit(req, 'cp1_entry', trip.trip_id, null, trip);
  res.status(201).json(trip);
});

// PATCH /trips/:id/cp2 — stockpile operator records truck departure
router.patch('/:id/cp2', requireRole('stockpile_operator', 'admin', 'supervisor'), async (req, res) => {
  const { id } = req.params;
  const { gross_site_kg } = req.body;

  if (!gross_site_kg || gross_site_kg <= 0) {
    return res.status(400).json({ error: 'gross_site_kg is required and must be positive' });
  }

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.is_locked) return res.status(409).json({ error: 'Trip is locked and cannot be modified' });
  if (trip.session_id) {
    const sess = await queryOne('select site_locked from sessions where session_id = $1', [trip.session_id]);
    if (sess?.site_locked) return res.status(409).json({ error: 'Session site data is locked' });
  }
  if (trip.status !== 'pending') return res.status(409).json({ error: 'Trip is not in pending status' });

  const netto_site_kg = gross_site_kg - trip.tare_site_kg;

  const [updated] = await query(
    `update trips
     set gross_site_kg = $1, netto_site_kg = $2, cp2_timestamp = now(), status = 'in_transit'
     where trip_id = $3
     returning *`,
    [gross_site_kg, netto_site_kg, id]
  );

  await logAudit(req, 'cp2_entry', id, trip, updated);
  res.json(updated);
});

// PATCH /trips/:id/cp3 — jetty operator records truck arrival at jetty
router.patch('/:id/cp3', requireRole('jetty_operator', 'admin', 'supervisor'), async (req, res) => {
  const { id } = req.params;
  const { gross_jetty_kg, tare_jetty_kg, stockpile_code } = req.body;

  if (!gross_jetty_kg || gross_jetty_kg <= 0) {
    return res.status(400).json({ error: 'gross_jetty_kg is required and must be positive' });
  }
  if (tare_jetty_kg != null && tare_jetty_kg < 0) {
    return res.status(400).json({ error: 'tare_jetty_kg must be non-negative' });
  }

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.is_locked) return res.status(409).json({ error: 'Trip is locked and cannot be modified' });
  if (trip.session_id) {
    const sess = await queryOne('select jetty_locked from sessions where session_id = $1', [trip.session_id]);
    if (sess?.jetty_locked) return res.status(409).json({ error: 'Session jetty data is locked' });
  }
  if (trip.status !== 'in_transit') return res.status(409).json({ error: 'Trip is not in_transit status' });

  const tare_kg          = tare_jetty_kg != null ? Number(tare_jetty_kg) : null;
  const netto_jetty_kg   = tare_kg != null ? gross_jetty_kg - tare_kg : gross_jetty_kg;
  const compare_gross_kg = gross_jetty_kg - trip.gross_site_kg;
  const deviasi_kg       = netto_jetty_kg - trip.netto_site_kg;

  const [updated] = await query(
    `update trips
     set gross_jetty_kg   = $1,
         tare_jetty_kg    = $2,
         netto_jetty_kg   = $3,
         compare_gross_kg = $4,
         deviasi_kg       = $5,
         stockpile_code   = $6,
         cp3_timestamp    = now(),
         status           = 'completed'
     where trip_id = $7
     returning *`,
    [gross_jetty_kg, tare_kg, netto_jetty_kg, compare_gross_kg, deviasi_kg, (stockpile_code || '').trim(), id]
  );

  await logAudit(req, 'cp3_entry', id, trip, updated);
  res.json(updated);
});

// GET /trips/today?jetty= — all trips today (all roles)
router.get('/today', requireRole('stockpile_operator', 'jetty_operator', 'admin', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { jetty } = req.query;
  const today = witaDate();

  const conditions = [`date = $1`];
  const values = [today];

  if (jetty) {
    conditions.push(`jetty_destination = $2`);
    values.push(jetty);
  }

  const trips = await query(
    `select * from trips where ${conditions.join(' and ')} order by no_tiket asc`,
    values
  );
  res.json(trips);
});

// GET /trips/search?no_lambung=&status= — find today's trip by truck ID
router.get('/search', requireRole('stockpile_operator', 'jetty_operator', 'admin', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { no_lambung, status } = req.query;
  if (!no_lambung) return res.status(400).json({ error: 'no_lambung is required' });

  const today = witaDate();
  const values = [today, no_lambung.trim().toUpperCase()];
  let sql = 'select * from trips where date = $1 and no_lambung = $2';

  if (status) {
    sql += ' and status = $3';
    values.push(status);
  }

  const trip = await queryOne(sql, values);
  if (!trip) return res.status(404).json({ error: 'No matching trip found for this truck today' });

  res.json(trip);
});

// GET /trips/incoming?jetty= — jetty operator: all in_transit trips today
router.get('/incoming', requireRole('jetty_operator', 'admin', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { jetty } = req.query;
  const today = witaDate();

  const conditions = [`date = $1`, `status = 'in_transit'`];
  const values = [today];

  if (jetty) {
    conditions.push(`jetty_destination = $2`);
    values.push(jetty);
  }

  const trips = await query(
    `select * from trips where ${conditions.join(' and ')} order by cp2_timestamp asc`,
    values
  );

  res.json(trips);
});

// GET /trips/export?from=&to=&jetty= — Excel export (all roles)
router.get('/export', requireRole('stockpile_operator', 'jetty_operator', 'admin', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { from, to, jetty } = req.query;
  if (!from || !to || !jetty) return res.status(400).json({ error: 'from, to and jetty are required' });

  const trips = await query(
    `select * from trips
     where date >= $1 and date <= $2 and jetty_destination = $3 and status = 'completed'
     order by date asc, no_tiket asc`,
    [from, to, jetty]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Trips');

  const TOTAL_COLS = 14;
  const jettyLabel = jetty === 'hasnur' ? 'HBM' : 'Talenta';

  const toHHMM = (ts) => {
    if (!ts) return '';
    const wita = new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000);
    return wita.toISOString().slice(11, 16);
  };

  const numFmt = '#,##0';
  const centerAlign = { horizontal: 'center', vertical: 'middle' };
  const rightAlign  = { horizontal: 'right',  vertical: 'middle' };
  const leftAlign   = { horizontal: 'left',   vertical: 'middle' };

  const [fy, fm, fd] = from.split('-');
  const [ty, tm, td] = to.split('-');
  const titleDate = from === to
    ? `${fy}年${fm}月${fd}日运煤明细`
    : `${fy}年${fm}月${fd}日 - ${ty}年${tm}月${td}日运煤明细`;
  const dateRange = from === to ? from : `${from} ~ ${to}`;

  // Row 1 — title
  sheet.addRow([titleDate]);
  sheet.mergeCells(1, 1, 1, TOTAL_COLS);
  sheet.getRow(1).height = 28;
  sheet.getRow(1).getCell(1).alignment = centerAlign;
  sheet.getRow(1).font = { bold: true, size: 16 };

  // Row 2 — date range
  sheet.addRow([dateRange]);
  sheet.mergeCells(2, 1, 2, TOTAL_COLS);
  sheet.getRow(2).height = 20;
  sheet.getRow(2).getCell(1).alignment = centerAlign;
  sheet.getRow(2).font = { size: 11 };

  // Row 3 — Chinese headers
  const chRow = sheet.addRow([
    '序号', '车号', '进入时间', '离开时间',
    '总重(MMI)', `总重(${jettyLabel})`, '相差',
    '皮重(MMI)',
    '净重(MMI)', `净重(${jettyLabel})`, '相差', '偏差%',
    '天气(MMI)', '媒质',
  ]);
  chRow.height = 22;
  chRow.font = { bold: true, size: 11 };
  chRow.eachCell((cell) => { cell.alignment = centerAlign; });

  // Row 4 — Indonesian headers
  const idRow = sheet.addRow([
    'No. Tiket', 'No Lambung', 'Jam Masuk (WITA)', 'Jam Keluar (WITA)',
    'Gross Site (KG)', `Gross ${jettyLabel} (KG)`, 'Compare Gross',
    'Tare Site (KG)',
    'Netto Site (KG)', `Netto ${jettyLabel} (KG)`, 'Deviasi (KG)', 'Deviasi (%)',
    'Cuaca (MMI)', 'Coal quality',
  ]);
  idRow.height = 22;
  idRow.font = { bold: true, size: 10 };
  idRow.eachCell((cell) => { cell.alignment = centerAlign; });

  // Freeze header rows
  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  // Data rows + running totals
  let sumGrossSite = 0, sumGrossJetty = 0, sumCompareGross = 0;
  let sumTareSite = 0, sumNettoSite = 0, sumNettoJetty = 0, sumDeviasi = 0;

  trips.forEach((t) => {
    sumGrossSite    += t.gross_site_kg    || 0;
    sumGrossJetty   += t.gross_jetty_kg   || 0;
    sumCompareGross += t.compare_gross_kg || 0;
    sumTareSite     += t.tare_site_kg     || 0;
    sumNettoSite    += t.netto_site_kg    || 0;
    sumNettoJetty   += t.netto_jetty_kg   || 0;
    sumDeviasi      += t.deviasi_kg       || 0;

    const devPct = t.netto_site_kg ? Math.abs(t.deviasi_kg / t.netto_site_kg) * 100 : null;
    const dataRow = sheet.addRow([
      t.no_tiket,
      t.no_lambung,
      toHHMM(t.cp1_timestamp),
      toHHMM(t.cp2_timestamp),
      t.gross_site_kg,
      t.gross_jetty_kg,
      t.compare_gross_kg,
      t.tare_site_kg,
      t.netto_site_kg,
      t.netto_jetty_kg,
      t.deviasi_kg,
      devPct != null ? Math.round(devPct * 100) / 100 : null,
      t.cuaca_mmi,
      (t.coal_quality === 'raw' || t.coal_quality === 'premium') ? 'Premium' : 'Standard',
    ]);
    dataRow.height = 18;
    dataRow.font = { size: 11 };
    dataRow.getCell(1).alignment  = centerAlign;
    dataRow.getCell(2).alignment  = centerAlign;
    dataRow.getCell(3).alignment  = centerAlign;
    dataRow.getCell(4).alignment  = centerAlign;
    dataRow.getCell(13).alignment = leftAlign;
    dataRow.getCell(14).alignment = centerAlign;
    // Number format for KG columns
    [5,6,7,8,9,10,11].forEach((c) => {
      dataRow.getCell(c).numFmt = numFmt;
      dataRow.getCell(c).alignment = rightAlign;
    });
    dataRow.getCell(12).numFmt = '0.00"%"';
    dataRow.getCell(12).alignment = rightAlign;
  });

  // Totals row
  const totalDevPct = sumNettoSite ? Math.round(Math.abs(sumDeviasi / sumNettoSite) * 10000) / 100 : null;
  const totalsRow = sheet.addRow([
    '', '总计 / TOTAL', '', '',
    sumGrossSite, sumGrossJetty, sumCompareGross,
    sumTareSite, sumNettoSite, sumNettoJetty, sumDeviasi, totalDevPct,
    '', '',
  ]);
  totalsRow.height = 22;
  totalsRow.font = { bold: true, size: 12 };
  totalsRow.getCell(2).alignment = centerAlign;
  [5,6,7,8,9,10,11].forEach((c) => {
    totalsRow.getCell(c).numFmt = numFmt;
    totalsRow.getCell(c).alignment = rightAlign;
  });
  totalsRow.getCell(12).numFmt = '0.00"%"';
  totalsRow.getCell(12).alignment = rightAlign;

  // Column widths
  const colWidths = [10, 20, 20, 20, 18, 18, 16, 16, 16, 16, 16, 12, 18, 14];
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=trips_${from}_${to}_${jetty}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /trips/truck-history?no_lambung=&from=&to= — all-time trips for a truck
router.get('/truck-history', requireRole('stockpile_operator', 'jetty_operator', 'analytics', 'admin', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { no_lambung, from, to } = req.query;
  if (!no_lambung) return res.status(400).json({ error: 'no_lambung is required' });

  const conds = ['no_lambung = $1'];
  const vals  = [no_lambung.trim().toUpperCase()];
  let idx = 2;
  if (from) { conds.push(`date >= $${idx++}`); vals.push(from); }
  if (to)   { conds.push(`date <= $${idx++}`); vals.push(to); }

  const trips = await query(
    `select *,
       round(abs(deviasi_kg::numeric / nullif(netto_site_kg, 0)) * 100, 2) as deviation_pct
     from trips
     where ${conds.join(' and ')}
     order by date desc, no_tiket asc`,
    vals
  );
  res.json(trips.map((r) => ({ ...r, deviation_pct: r.deviation_pct != null ? Number(r.deviation_pct) : null })));
});

// GET /trips/truck-history/export?no_lambung=&from=&to= — Excel for truck history
router.get('/truck-history/export', requireRole('analytics', 'admin'), async (req, res) => {
  const { no_lambung, from, to } = req.query;
  if (!no_lambung) return res.status(400).json({ error: 'no_lambung is required' });

  const conds = ['no_lambung = $1'];
  const vals  = [no_lambung.trim().toUpperCase()];
  let idx = 2;
  if (from) { conds.push(`date >= $${idx++}`); vals.push(from); }
  if (to)   { conds.push(`date <= $${idx++}`); vals.push(to); }

  const trips = await query(
    `select *,
       round(abs(deviasi_kg::numeric / nullif(netto_site_kg, 0)) * 100, 2) as deviation_pct
     from trips
     where ${conds.join(' and ')}
     order by date desc, no_tiket asc`,
    vals
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Truck History');
  const numFmt = '#,##0';
  const center = { horizontal: 'center', vertical: 'middle' };
  const right  = { horizontal: 'right',  vertical: 'middle' };

  const headerRow = sheet.addRow([
    'Tanggal', 'No.Tiket', 'Jetty', 'Coal', 'Tare (kg)',
    'Gross Site (kg)', 'Netto Site (kg)',
    'Gross Jetty (kg)', 'Netto Jetty (kg)',
    'Deviasi (kg)', 'Deviasi %', 'Status',
  ]);
  headerRow.font = { bold: true, size: 11 };
  headerRow.eachCell((cell) => { cell.alignment = center; });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const toHHMM = (ts) => {
    if (!ts) return '';
    return new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(11, 16);
  };

  trips.forEach((t) => {
    const row = sheet.addRow([
      t.date, t.no_tiket,
      t.jetty_destination === 'hasnur' ? 'HBM' : 'Talenta',
      (t.coal_quality === 'raw' || t.coal_quality === 'premium') ? 'Premium' : 'Standard',
      t.tare_site_kg, t.gross_site_kg, t.netto_site_kg,
      t.gross_jetty_kg, t.netto_jetty_kg,
      t.deviasi_kg, t.deviation_pct != null ? Number(t.deviation_pct) : null,
      t.status,
    ]);
    row.height = 18;
    [5,6,7,8,9,10].forEach((c) => {
      row.getCell(c).numFmt = numFmt;
      row.getCell(c).alignment = right;
    });
    if (t.deviation_pct != null && Number(t.deviation_pct) > 0.5) {
      row.getCell(11).font = { color: { argb: 'FFCC0000' } };
    }
  });

  const colWidths = [14, 10, 12, 10, 14, 18, 16, 18, 16, 14, 12, 12];
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=truck_${no_lambung.replace(/\s/g,'_')}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /trips — admin/jetty_operator list with filters
router.get('/', requireRole('admin', 'jetty_operator', 'site_jetty_operator', 'supervisor'), async (req, res) => {
  const { date, date_from, date_to, jetty, status } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (date)      { conditions.push(`date = $${idx++}`);               values.push(date); }
  if (date_from) { conditions.push(`date >= $${idx++}`);              values.push(date_from); }
  if (date_to)   { conditions.push(`date <= $${idx++}`);              values.push(date_to); }
  if (jetty)     { conditions.push(`jetty_destination = $${idx++}`);  values.push(jetty); }
  if (status)    { conditions.push(`status = $${idx++}`);             values.push(status); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const trips = await query(
    `select * from trips ${where} order by date desc, no_tiket asc`,
    values
  );
  res.json(trips);
});

// PATCH /trips/:id/lock — admin only, toggles is_locked
router.patch('/:id/lock', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const [updated] = await query(
    'update trips set is_locked = NOT is_locked where trip_id = $1 returning *',
    [id]
  );
  res.json(updated);
});

// PATCH /trips/:id — admin/supervisor free-form edit, recalculates derived fields
router.patch('/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.is_locked) return res.status(409).json({ error: 'Trip is locked and cannot be modified' });

  const m = { ...trip, ...updates };

  if (m.gross_site_kg != null && m.tare_site_kg != null) {
    m.netto_site_kg = m.gross_site_kg - m.tare_site_kg;
  }
  if (m.gross_jetty_kg != null) {
    m.netto_jetty_kg   = m.tare_jetty_kg != null ? m.gross_jetty_kg - m.tare_jetty_kg : m.gross_jetty_kg;
    m.compare_gross_kg = m.gross_jetty_kg - (m.gross_site_kg || 0);
    m.deviasi_kg       = m.netto_jetty_kg - (m.netto_site_kg || 0);
  }

  const [updated] = await query(
    `update trips set
       date              = $1,
       status            = $2,
       no_tiket          = $3,
       no_lambung        = $4,
       jetty_destination = $5,
       coal_quality      = $6,
       cuaca_mmi         = $7,
       tare_site_kg      = $8,
       cp1_timestamp     = $9,
       gross_site_kg     = $10,
       netto_site_kg     = $11,
       cp2_timestamp     = $12,
       gross_jetty_kg    = $13,
       tare_jetty_kg     = $14,
       netto_jetty_kg    = $15,
       compare_gross_kg  = $16,
       deviasi_kg        = $17,
       cp3_timestamp     = $18,
       adjustment_kg     = $19
     where trip_id = $20
     returning *`,
    [
      m.date, m.status, m.no_tiket, m.no_lambung,
      m.jetty_destination, m.coal_quality, m.cuaca_mmi, m.tare_site_kg,
      m.cp1_timestamp, m.gross_site_kg, m.netto_site_kg, m.cp2_timestamp,
      m.gross_jetty_kg, m.tare_jetty_kg ?? null, m.netto_jetty_kg,
      m.compare_gross_kg, m.deviasi_kg, m.cp3_timestamp,
      m.adjustment_kg ?? 0,
      id,
    ]
  );

  await logAudit(req, 'edit_trip', id, trip, updated);
  res.json(updated);
});

export default router;
