import { Router } from 'express';
import ExcelJS from 'exceljs';
import { query, queryOne } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Date in WITA (UTC+8) — so "today" is correct for operators on-site
function witaDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// POST /trips — pit operator creates a trip
router.post('/', requireRole('pit_operator', 'admin'), async (req, res) => {
  const { truck_id, jetty_destination, coal_quality, weather, gross_weight_kg } = req.body;

  if (!truck_id || !jetty_destination || !coal_quality || !weather || !gross_weight_kg) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const today = witaDate();

  const existing = await queryOne(
    'select trip_id from trips where truck_id = $1 and date = $2',
    [truck_id, today]
  );
  if (existing) {
    return res.status(409).json({ error: `Truck ${truck_id} already has a trip today` });
  }

  const [trip] = await query(
    `insert into trips (date, truck_id, jetty_destination, coal_quality, weather, gross_weight_kg, pit_timestamp, status)
     values ($1, $2, $3, $4, $5, $6, now(), 'in_progress')
     returning *`,
    [today, truck_id, jetty_destination, coal_quality, weather, gross_weight_kg]
  );

  res.status(201).json(trip);
});

// GET /trips/active?truck_id= — jetty operator fetches today's in_progress trip
router.get('/active', requireRole('jetty_operator', 'admin'), async (req, res) => {
  const { truck_id } = req.query;
  if (!truck_id) return res.status(400).json({ error: 'truck_id is required' });

  const today = witaDate();
  const trip = await queryOne(
    `select * from trips
     where truck_id = $1 and date = $2 and status = 'in_progress'`,
    [truck_id, today]
  );

  if (!trip) return res.status(404).json({ error: 'No active trip found for this truck today' });
  res.json(trip);
});

// GET /trips/export?date=&jetty= — admin Excel export
router.get('/export', requireRole('admin'), async (req, res) => {
  const { date, jetty } = req.query;
  if (!date || !jetty) return res.status(400).json({ error: 'date and jetty are required' });

  const trips = await query(
    `select * from trips
     where date = $1 and jetty_destination = $2 and status = 'completed'
     order by pit_timestamp asc`,
    [date, jetty]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Trips');

  const isTalenta = jetty === 'talenta';
  const baseColCount = 9;
  const totalCols = isTalenta ? baseColCount + 6 : baseColCount;

  const toWITA = (ts) => {
    if (!ts) return '';
    const wita = new Date(new Date(ts).getTime() + 8 * 60 * 60 * 1000);
    return wita.toISOString().replace('T', ' ').slice(0, 19);
  };

  const [year, month, day] = date.split('-');

  // Row 1 — title
  sheet.addRow([`${year}年${month}月${day}日运煤明细`]);
  sheet.mergeCells(1, 1, 1, totalCols);
  sheet.getRow(1).getCell(1).alignment = { horizontal: 'center' };
  sheet.getRow(1).font = { bold: true, size: 14 };

  // Row 2 — date
  sheet.addRow([date]);
  sheet.mergeCells(2, 1, 2, totalCols);

  // Row 3 — Chinese headers
  const chHeaders = ['序号', '车号', '进入时间', '离开时间', '总重(MMI)', '皮重(MMI)', '净重(MMI)', '天气(MMI)', '媒质'];
  if (isTalenta) chHeaders.push('总重(Talenta)', 'Compare Gross', '皮重(Talenta)', 'Compare Tare', '净重(Talenta)', 'Deviasi (KG)');
  sheet.addRow(chHeaders);
  sheet.getRow(3).font = { bold: true };

  // Row 4 — Indonesian headers
  const idHeaders = ['No. Tiket', 'No Lambung', 'Jam Masuk (WITA)', 'Jam Keluar (WITA)',
    'Gross Site (KG)', 'Tare Site (KG)', 'Netto Site (KG)', 'Cuaca (MMI)', 'Coal quality'];
  if (isTalenta) idHeaders.push('Gross Talenta (KG)', 'Selisih Gross', 'Tare Talenta (KG)', 'Selisih Tare', 'Netto Talenta (KG)', 'Deviasi (KG)');
  sheet.addRow(idHeaders);
  sheet.getRow(4).font = { bold: true };

  // Data rows
  let totalGross = 0, totalTare = 0, totalNet = 0;
  trips.forEach((t, i) => {
    totalGross += t.gross_weight_kg || 0;
    totalTare  += t.tare_weight_kg  || 0;
    totalNet   += t.net_weight_kg   || 0;

    const row = [
      i + 1,
      t.truck_id,
      toWITA(t.pit_timestamp),
      toWITA(t.jetty_timestamp),
      t.gross_weight_kg,
      t.tare_weight_kg,
      t.net_weight_kg,
      t.weather,
      t.coal_quality,
    ];

    if (isTalenta) {
      const compareGross = t.talenta_weight_kg != null ? t.gross_weight_kg - t.talenta_weight_kg : '';
      const talentaNet   = t.talenta_weight_kg != null && t.tare_weight_kg != null
        ? t.talenta_weight_kg - t.tare_weight_kg : '';
      row.push(
        t.talenta_weight_kg ?? '',
        compareGross,
        t.talenta_weight_kg ?? '',
        t.deviation_kg ?? '',
        talentaNet,
        t.deviation_kg ?? ''
      );
    }

    sheet.addRow(row);
  });

  // Totals row
  const totalsRow = ['', 'TOTAL', '', '', totalGross, totalTare, totalNet, '', ''];
  if (isTalenta) totalsRow.push('', '', '', '', '', '');
  const lastRow = sheet.addRow(totalsRow);
  lastRow.font = { bold: true };

  // Column widths
  const colWidths = [8, 14, 22, 22, 16, 16, 16, 16, 14];
  if (isTalenta) colWidths.push(18, 16, 18, 16, 18, 14);
  colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=trips_${date}_${jetty}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /trips?date=&jetty=&status= — admin list with filters
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
    `select * from trips ${where} order by pit_timestamp desc`,
    values
  );
  res.json(trips);
});

// PATCH /trips/:id — complete trip (jetty) or admin edit
router.patch('/:id', requireRole('jetty_operator', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.user;
  const updates = req.body;

  const trip = await queryOne('select * from trips where trip_id = $1', [id]);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (role === 'jetty_operator') {
    const { tare_weight_kg, talenta_weight_kg } = updates;

    if (tare_weight_kg == null) {
      return res.status(400).json({ error: 'tare_weight_kg is required' });
    }
    if (trip.jetty_destination === 'talenta' && talenta_weight_kg == null) {
      return res.status(400).json({ error: 'talenta_weight_kg is required for Talenta destination' });
    }

    const net_weight_kg = trip.gross_weight_kg - tare_weight_kg;
    const deviation_kg  = trip.jetty_destination === 'talenta'
      ? tare_weight_kg - talenta_weight_kg : null;

    const [updated] = await query(
      `update trips
       set tare_weight_kg    = $1,
           net_weight_kg     = $2,
           talenta_weight_kg = $3,
           deviation_kg      = $4,
           jetty_timestamp   = now(),
           status            = 'completed'
       where trip_id = $5
       returning *`,
      [tare_weight_kg, net_weight_kg,
       trip.jetty_destination === 'talenta' ? talenta_weight_kg : null,
       deviation_kg, id]
    );
    return res.json(updated);
  }

  // Admin free-form edit — merge and recalculate derived fields
  const merged = { ...trip, ...updates };
  merged.net_weight_kg = merged.gross_weight_kg - (merged.tare_weight_kg ?? 0);
  if (merged.jetty_destination === 'talenta' && merged.tare_weight_kg != null && merged.talenta_weight_kg != null) {
    merged.deviation_kg = merged.tare_weight_kg - merged.talenta_weight_kg;
  }

  const [updated] = await query(
    `update trips
     set date              = $1,
         truck_id          = $2,
         jetty_destination = $3,
         coal_quality      = $4,
         weather           = $5,
         gross_weight_kg   = $6,
         tare_weight_kg    = $7,
         talenta_weight_kg = $8,
         deviation_kg      = $9,
         net_weight_kg     = $10,
         status            = $11,
         pit_timestamp     = $12,
         jetty_timestamp   = $13
     where trip_id = $14
     returning *`,
    [
      merged.date, merged.truck_id, merged.jetty_destination, merged.coal_quality,
      merged.weather, merged.gross_weight_kg, merged.tare_weight_kg,
      merged.talenta_weight_kg, merged.deviation_kg, merged.net_weight_kg,
      merged.status, merged.pit_timestamp, merged.jetty_timestamp, id,
    ]
  );
  res.json(updated);
});

export default router;
