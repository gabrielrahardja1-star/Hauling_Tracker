import 'dotenv/config';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../Data Hauling consolidated for 22-23 June');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

const DATES = ['2026-06-22', '2026-06-23'];

function coalQuality(raw) {
  if (raw === '精煤') return 'premium';
  if (raw === '原煤') return 'standard';
  return String(raw || '').toLowerCase() || 'premium';
}

// WITA (UTC+8) time → UTC ISO string
function witaToUtc(dateStr, t) {
  if (!t) return null;
  let hh, mm;
  if (t instanceof Date) {
    hh = t.getUTCHours(); mm = t.getUTCMinutes();
  } else if (typeof t === 'string') {
    const parts = t.split(':');
    hh = Number(parts[0]); mm = Number(parts[1]);
  } else {
    return null;
  }
  if (isNaN(hh) || isNaN(mm)) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh - 8, mm, 0)).toISOString();
}

// June 22 Compiled: No, No Lambung, Site:Jam Masuk, Site:Jam Keluar,
//   Site:Gross(KG), Site:Tare(KG), Site:Netto(KG), Site:Cuaca, Site:Coal Quality,
//   Jetty:Brute, Jetty:Tare, Jetty:Netto, Jetty:Jam Tiba
function parseJune22(ws) {
  const trips = [];
  ws.eachRow((row, rn) => {
    if (rn < 2) return;
    const noTiket = row.getCell(1).value;
    if (typeof noTiket !== 'number') return;

    const noLambung   = String(row.getCell(2).value || '').trim().toUpperCase();
    const cp1Raw      = row.getCell(3).value;
    const cp2Raw      = row.getCell(4).value;
    const grossSite   = Number(row.getCell(5).value) || 0;
    const tareSite    = Number(row.getCell(6).value) || 0;
    const nettoSiteRaw = row.getCell(7).value;
    const nettoSite   = Number(nettoSiteRaw?.result ?? nettoSiteRaw) || (grossSite - tareSite);
    const cuaca       = String(row.getCell(8).value || '').trim();
    const quality     = coalQuality(row.getCell(9).value);
    const grossJetty  = Number(row.getCell(10).value) || 0;
    const tareJetty   = Number(row.getCell(11).value) || 0;
    const nettoJettyRaw = row.getCell(12).value;
    const nettoJetty  = Number(nettoJettyRaw?.result ?? nettoJettyRaw) || (grossJetty - tareJetty);
    const cp3Raw      = row.getCell(13).value;

    const dateStr = '2026-06-22';
    trips.push({
      date: dateStr,
      no_tiket: noTiket,
      no_lambung: noLambung,
      coal_quality: quality,
      cuaca_mmi: cuaca,
      tare_site_kg: tareSite,
      gross_site_kg: grossSite,
      netto_site_kg: nettoSite,
      cp1_timestamp: witaToUtc(dateStr, cp1Raw),
      cp2_timestamp: witaToUtc(dateStr, cp2Raw),
      tare_jetty_kg: tareJetty,
      gross_jetty_kg: grossJetty,
      netto_jetty_kg: nettoJetty,
      deviasi_kg: nettoJetty - nettoSite,
      cp3_timestamp: witaToUtc(dateStr, cp3Raw),
    });
  });
  return trips;
}

// June 23 Compiled: No.Tiket, No(Jetty), No Lambung, Tanggal,
//   Jam Masuk, Jam Keluar, Jam Tiba,
//   Gross Site(KG), Tare Site(KG), Netto Site(KG),
//   Bruto Jetty(ton), Tare Jetty(ton), Netto Jetty(ton),
//   Cuaca(MMI), Coal Quality
function parseJune23(ws) {
  const trips = [];
  ws.eachRow((row, rn) => {
    if (rn < 2) return;
    const noTiket = row.getCell(1).value;
    if (typeof noTiket !== 'number') return;

    const noLambung   = String(row.getCell(3).value || '').trim().toUpperCase();
    const cp1Raw      = row.getCell(5).value;
    const cp2Raw      = row.getCell(6).value;
    const cp3Raw      = row.getCell(7).value;
    const grossSite   = Number(row.getCell(8).value) || 0;
    const tareSite    = Number(row.getCell(9).value) || 0;
    const nettoSiteRaw = row.getCell(10).value;
    const nettoSite   = Number(nettoSiteRaw?.result ?? nettoSiteRaw) || (grossSite - tareSite);
    // Jetty weights are in tons → convert to KG
    const grossJetty  = Math.round((Number(row.getCell(11).value) || 0) * 1000);
    const tareJetty   = Math.round((Number(row.getCell(12).value) || 0) * 1000);
    const nettoJettyRaw = row.getCell(13).value;
    const nettoJetty  = Math.round((Number(nettoJettyRaw?.result ?? nettoJettyRaw) || 0) * 1000);
    const cuaca       = String(row.getCell(14).value || '').trim();
    const quality     = coalQuality(row.getCell(15).value);

    const dateStr = '2026-06-23';
    trips.push({
      date: dateStr,
      no_tiket: noTiket,
      no_lambung: noLambung,
      coal_quality: quality,
      cuaca_mmi: cuaca,
      tare_site_kg: tareSite,
      gross_site_kg: grossSite,
      netto_site_kg: nettoSite,
      cp1_timestamp: witaToUtc(dateStr, cp1Raw),
      cp2_timestamp: witaToUtc(dateStr, cp2Raw),
      tare_jetty_kg: tareJetty,
      gross_jetty_kg: grossJetty,
      netto_jetty_kg: nettoJetty,
      deviasi_kg: nettoJetty - nettoSite,
      cp3_timestamp: witaToUtc(dateStr, cp3Raw),
    });
  });
  return trips;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing data for both dates
    for (const date of DATES) {
      const { rowCount } = await client.query(
        'DELETE FROM trips WHERE date = $1',
        [date]
      );
      console.log(`Deleted ${rowCount} existing rows for ${date}`);
    }

    const files = [
      { path: join(DATA_DIR, 'Data Hauling June 22 2026.xlsx'), sheetName: 'Compiled', parser: parseJune22, date: '2026-06-22' },
      { path: join(DATA_DIR, 'Data Hauling 23 June 2026.xlsx'), sheetName: 'Compiled', parser: parseJune23, date: '2026-06-23' },
    ];

    for (const { path, sheetName, parser, date } of files) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(path);
      const ws = wb.getWorksheet(sheetName);
      if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${path}`);

      const trips = parser(ws);
      console.log(`\n${date}: parsed ${trips.length} trips`);

      let inserted = 0;
      for (const t of trips) {
        await client.query(
          `INSERT INTO trips (
            trip_id, date, no_tiket, no_lambung,
            jetty_destination, coal_quality, cuaca_mmi,
            tare_site_kg, gross_site_kg, netto_site_kg,
            cp1_timestamp, cp2_timestamp,
            tare_jetty_kg, gross_jetty_kg, netto_jetty_kg,
            deviasi_kg, cp3_timestamp,
            status
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10,
            $11, $12,
            $13, $14, $15,
            $16, $17,
            'completed'
          )`,
          [
            randomUUID(), t.date, t.no_tiket, t.no_lambung,
            'hasnur', t.coal_quality, t.cuaca_mmi,
            t.tare_site_kg, t.gross_site_kg, t.netto_site_kg,
            t.cp1_timestamp, t.cp2_timestamp,
            t.tare_jetty_kg, t.gross_jetty_kg, t.netto_jetty_kg,
            t.deviasi_kg, t.cp3_timestamp,
          ]
        );
        inserted++;
      }
      console.log(`  Inserted: ${inserted}`);
    }

    await client.query('COMMIT');
    console.log('\nDone. Transaction committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error — rolled back:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
