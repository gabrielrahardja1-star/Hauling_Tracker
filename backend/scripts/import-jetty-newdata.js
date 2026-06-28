import 'dotenv/config';
import ExcelJS from 'exceljs';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../new data');
const FILES = ['hauling_may.xlsx', 'hauling_data June1-4.xlsx'];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

// Handles "22-05-26" (DD-MM-YY) and "01/06/2026" (DD/MM/YYYY)
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.includes('/')) {
    const [d, m, y] = s.split('/');
    return `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const [d, m, y] = s.split('-');
  return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Returns ISO UTC string from WITA date + "HH:MM" time
function parseTime(dateStr, timeRaw) {
  if (!timeRaw) return null;
  let hh, mm;
  if (timeRaw instanceof Date) {
    hh = timeRaw.getUTCHours(); mm = timeRaw.getUTCMinutes();
  } else {
    const parts = String(timeRaw).split(':');
    hh = Number(parts[0]); mm = Number(parts[1]);
  }
  if (isNaN(hh) || isNaN(mm)) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh - 8, mm, 0)).toISOString();
}

async function main() {
  let totalUpdated = 0, totalUnmatched = 0;

  for (const file of FILES) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(DATA_DIR, file));
    const sheet = wb.worksheets[0];

    // Group jetty rows by date → truck
    const byDateTruck = new Map();
    sheet.eachRow((row, rn) => {
      if (rn < 2) return;
      const unit = String(row.getCell(4).value || '').trim().toUpperCase();
      if (!unit.startsWith('PJM')) return;
      const dateStr = parseDate(row.getCell(5).value);
      if (!dateStr) return;

      const gross = Math.round((Number(row.getCell(8).value) || 0) * 1000);
      const tare  = Math.round((Number(row.getCell(9).value) || 0) * 1000);
      const nettoRaw = row.getCell(10).value;
      const netto = Math.round((Number(nettoRaw?.result ?? nettoRaw) || (gross - tare) / 1000) * 1000);
      const cp3 = parseTime(dateStr, row.getCell(6).value);

      if (!byDateTruck.has(dateStr)) byDateTruck.set(dateStr, new Map());
      const truckMap = byDateTruck.get(dateStr);
      if (!truckMap.has(unit)) truckMap.set(unit, []);
      truckMap.get(unit).push({ gross, tare, netto, cp3 });
    });

    console.log(`\n${file}: ${byDateTruck.size} dates`);

    for (const [dateStr, truckMap] of byDateTruck) {
      const { rows: siteTrips } = await pool.query(
        `SELECT * FROM trips WHERE date = $1 ORDER BY no_lambung, cp2_timestamp`,
        [dateStr]
      );

      const siteByTruck = new Map();
      for (const t of siteTrips) {
        if (!siteByTruck.has(t.no_lambung)) siteByTruck.set(t.no_lambung, []);
        siteByTruck.get(t.no_lambung).push(t);
      }

      let updated = 0, unmatched = 0;

      for (const [truck, jettyArr] of truckMap) {
        const siteArr = siteByTruck.get(truck);
        if (!siteArr?.length) {
          unmatched += jettyArr.length;
          console.log(`  UNMATCHED: ${truck} on ${dateStr}`);
          continue;
        }

        jettyArr.sort((a, b) => (a.cp3 ?? '') < (b.cp3 ?? '') ? -1 : 1);
        siteArr.sort((a, b) => new Date(a.cp2_timestamp ?? 0) - new Date(b.cp2_timestamp ?? 0));
        const used = new Set();

        for (const j of jettyArr) {
          let best = null, bestDiff = Infinity;
          for (const s of siteArr) {
            if (used.has(s.trip_id)) continue;
            const cp2 = s.cp2_timestamp ? new Date(s.cp2_timestamp) : null;
            const cp3 = j.cp3 ? new Date(j.cp3) : null;
            if (cp2 && cp3 && cp2 < cp3) {
              const diff = cp3 - cp2;
              if (diff < bestDiff) { bestDiff = diff; best = s; }
            }
          }
          if (!best) {
            for (const s of siteArr) { if (!used.has(s.trip_id)) { best = s; break; } }
          }
          if (!best) { unmatched++; continue; }

          used.add(best.trip_id);
          const deviasi = j.netto - (best.netto_site_kg || 0);

          await pool.query(
            `UPDATE trips SET
               gross_jetty_kg = $1,
               tare_jetty_kg  = $2,
               netto_jetty_kg = $3,
               deviasi_kg     = $4,
               cp3_timestamp  = $5,
               status         = 'completed'
             WHERE trip_id = $6`,
            [j.gross, j.tare, j.netto, deviasi, j.cp3, best.trip_id]
          );
          updated++;
        }
      }

      console.log(`  ${dateStr}: updated ${updated}, unmatched ${unmatched}`);
      totalUpdated += updated;
      totalUnmatched += unmatched;
    }
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Unmatched: ${totalUnmatched}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
