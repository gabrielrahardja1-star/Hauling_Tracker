import { Router } from 'express';
import ExcelJS from 'exceljs';
import { query, queryOne } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function witaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// POST /trips — CP1: stockpile operator records truck arrival
router.post('/', requireRole('stockpile_operator', 'admin'), async (req, res) => {
  const { no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg } = req.body;

  if (!no_lambung || !jetty_destination || !coal_quality || !cuaca_mmi || !tare_site_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (tare_site_kg <= 0) {
    return res.status(400).json({ error: 'tare_site_kg must be positive' });
  }

  const today = witaDate();
  const lambung = no_lambung.trim().toUpperCase();

  const existing = await queryOne(
    'select trip_id from trips where date = $1 and no_lambung = $2',
    [today, lambung]
  );
  if (existing) {
    return res.status(409).json({ error: `Truck ${lambung} already has a trip today` });
  }

  const [trip] = await query(
    `with next_ticket as (
       select coalesce(max(no_tiket), 0) + 1 as no_tiket from trips where date = $1
     )
     insert into trips (date, no_tiket, no_lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg, cp1_timestamp, status)
     select $1, no_tiket, $2, $3, $4, $5, $6, now(), 'pending'
     from next_ticket
     returning *`,
    [today, lambung, jetty_destination, coal_quality, cuaca_mmi, tare_site_kg]
  );

  res.status(201).json(trip);
});

// PATCH /trips/:id/cp2 — stockpile operator records truck departure
router.patch('/:id/cp2', requireRole('stockpile_operator', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { gross_site_kg } = req.body;

  if (!gross_site_kg || gross_site_kg <= 0) {
    return res.status(400).json({ error: 'gross_site_kg is required and must be positive' });
  }

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'pending') return res.status(409).json({ error: 'Trip is not in pending status' });

  const netto_site_kg = gross_site_kg - trip.tare_site_kg;

  const [updated] = await query(
    `update trips
     set gross_site_kg = $1, netto_site_kg = $2, cp2_timestamp = now(), status = 'in_transit'
     where trip_id = $3
     returning *`,
    [gross_site_kg, netto_site_kg, id]
  );

  res.json(updated);
});

// PATCH /trips/:id/cp3 — jetty operator records truck arrival at jetty
router.patch('/:id/cp3', requireRole('jetty_operator', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { gross_jetty_kg } = req.body;

  if (!gross_jetty_kg || gross_jetty_kg <= 0) {
    return res.status(400).json({ error: 'gross_jetty_kg is required and must be positive' });
  }

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'in_transit') return res.status(409).json({ error: 'Trip is not in_transit status' });

  const netto_jetty_kg   = gross_jetty_kg;
  const compare_gross_kg = gross_jetty_kg - trip.gross_site_kg;
  const deviasi_kg       = netto_jetty_kg - trip.netto_site_kg;

  const [updated] = await query(
    `update trips
     set gross_jetty_kg   = $1,
         netto_jetty_kg   = $2,
         compare_gross_kg = $3,
         deviasi_kg       = $4,
         cp3_timestamp    = now(),
         status           = 'completed'
     where trip_id = $5
     returning *`,
    [gross_jetty_kg, netto_jetty_kg, compare_gross_kg, deviasi_kg, id]
  );

  res.json(updated);
});

// GET /trips/today?jetty= — all trips today (all roles)
router.get('/today', requireRole('stockpile_operator', 'jetty_operator', 'admin'), async (req, res) => {
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
router.get('/search', requireRole('stockpile_operator', 'jetty_operator', 'admin'), async (req, res) => {
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
router.get('/incoming', requireRole('jetty_operator', 'admin'), async (req, res) => {
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

// GET /trips/export?date=&jetty= — Excel export (all roles)
router.get('/export', requireRole('stockpile_operator', 'jetty_operator', 'admin'), async (req, res) => {
  const { date, jetty } = req.query;
  if (!date || !jetty) return res.status(400).json({ error: 'date and jetty are required' });

  const trips = await query(
    `select * from trips
     where date = $1 and jetty_destination = $2 and status = 'completed'
     order by no_tiket asc`,
    [date, jetty]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Trips');

  const TOTAL_COLS = 13;
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

  const [year, month, day] = date.split('-');

  // Row 1 — title
  sheet.addRow([`${year}年${month}月${day}日运煤明细`]);
  sheet.mergeCells(1, 1, 1, TOTAL_COLS);
  sheet.getRow(1).height = 28;
  sheet.getRow(1).getCell(1).alignment = centerAlign;
  sheet.getRow(1).font = { bold: true, size: 16 };

  // Row 2 — date
  sheet.addRow([new Date(date)]);
  sheet.mergeCells(2, 1, 2, TOTAL_COLS);
  sheet.getRow(2).height = 20;
  sheet.getRow(2).getCell(1).numFmt = 'yyyy-mm-dd';
  sheet.getRow(2).getCell(1).alignment = centerAlign;
  sheet.getRow(2).font = { size: 11 };

  // Row 3 — Chinese headers
  const chRow = sheet.addRow([
    '序号', '车号', '进入时间', '离开时间',
    '总重(MMI)', `总重(${jettyLabel})`, '相差',
    '皮重(MMI)',
    '净重(MMI)', `净重(${jettyLabel})`, '相差',
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
    'Netto Site (KG)', `Netto ${jettyLabel} (KG)`, 'Deviasi (KG)',
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
      t.cuaca_mmi,
      t.coal_quality === 'raw' ? '原煤' : '精煤',
    ]);
    dataRow.height = 18;
    dataRow.font = { size: 11 };
    dataRow.getCell(1).alignment  = centerAlign;
    dataRow.getCell(2).alignment  = centerAlign;
    dataRow.getCell(3).alignment  = centerAlign;
    dataRow.getCell(4).alignment  = centerAlign;
    dataRow.getCell(12).alignment = leftAlign;
    dataRow.getCell(13).alignment = centerAlign;
    // Number format for KG columns
    [5,6,7,8,9,10,11].forEach((c) => {
      dataRow.getCell(c).numFmt = numFmt;
      dataRow.getCell(c).alignment = rightAlign;
    });
  });

  // Totals row
  const totalsRow = sheet.addRow([
    '', '总计 / TOTAL', '', '',
    sumGrossSite, sumGrossJetty, sumCompareGross,
    sumTareSite, sumNettoSite, sumNettoJetty, sumDeviasi,
    '', '',
  ]);
  totalsRow.height = 22;
  totalsRow.font = { bold: true, size: 12 };
  totalsRow.getCell(2).alignment = centerAlign;
  [5,6,7,8,9,10,11].forEach((c) => {
    totalsRow.getCell(c).numFmt = numFmt;
    totalsRow.getCell(c).alignment = rightAlign;
  });

  // Column widths (wider)
  const colWidths = [10, 20, 20, 20, 18, 18, 16, 16, 16, 16, 16, 18, 14];
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=trips_${date}_${jetty}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /trips — admin list with filters
router.get('/', requireRole('admin'), async (req, res) => {
  const { date, jetty, status } = req.query;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (date)   { conditions.push(`date = $${idx++}`);               values.push(date); }
  if (jetty)  { conditions.push(`jetty_destination = $${idx++}`);  values.push(jetty); }
  if (status) { conditions.push(`status = $${idx++}`);             values.push(status); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const trips = await query(
    `select * from trips ${where} order by date desc, no_tiket asc`,
    values
  );
  res.json(trips);
});

// PATCH /trips/:id — admin free-form edit, recalculates derived fields
router.patch('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const m = { ...trip, ...updates };

  if (m.gross_site_kg != null && m.tare_site_kg != null) {
    m.netto_site_kg = m.gross_site_kg - m.tare_site_kg;
  }
  if (m.gross_jetty_kg != null) {
    m.netto_jetty_kg   = m.gross_jetty_kg;
    m.compare_gross_kg = m.gross_jetty_kg - (m.gross_site_kg || 0);
    m.deviasi_kg       = m.netto_jetty_kg - (m.netto_site_kg || 0);
  }

  const [updated] = await query(
    `update trips set
       date             = $1,
       status           = $2,
       no_tiket         = $3,
       no_lambung       = $4,
       jetty_destination = $5,
       coal_quality     = $6,
       cuaca_mmi        = $7,
       tare_site_kg     = $8,
       cp1_timestamp    = $9,
       gross_site_kg    = $10,
       netto_site_kg    = $11,
       cp2_timestamp    = $12,
       gross_jetty_kg   = $13,
       netto_jetty_kg   = $14,
       compare_gross_kg = $15,
       deviasi_kg       = $16,
       cp3_timestamp    = $17
     where trip_id = $18
     returning *`,
    [
      m.date, m.status, m.no_tiket, m.no_lambung,
      m.jetty_destination, m.coal_quality, m.cuaca_mmi, m.tare_site_kg,
      m.cp1_timestamp, m.gross_site_kg, m.netto_site_kg, m.cp2_timestamp,
      m.gross_jetty_kg, m.netto_jetty_kg,
      m.compare_gross_kg, m.deviasi_kg, m.cp3_timestamp,
      id,
    ]
  );

  res.json(updated);
});

export default router;
