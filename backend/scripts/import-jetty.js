import ExcelJS from 'exceljs';
import pg from 'pg';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../Fw_ Rekap Hauling MMI');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

// Parse "HH:MM" time string + date string into a UTC Date
function parseJettyTime(dateStr, timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Time is WITA (UTC+8), convert to UTC
  return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, 0));
}

// "PJM090" → "PJM 090"
function normalizeLambung(unit) {
  return String(unit).replace(/([A-Z]+)(\d+)/, '$1 $2').trim().toUpperCase();
}

async function parseSheet(sheet, dateStr) {
  const rows = [];
  sheet.eachRow((row, rn) => {
    if (rn < 5) return;
    const unit = row.getCell(3).value;
    if (typeof unit !== 'string' || !unit.startsWith('PJM')) return;

    const gross = Number(row.getCell(7).value) || 0;
    const tare  = Number(row.getCell(8).value) || 0;
    const nettoRaw = row.getCell(9).value;
    const netto = Number(nettoRaw?.result ?? nettoRaw) || (gross - tare);
    const timeStr = row.getCell(5).value;

    rows.push({
      no_lambung:    normalizeLambung(unit),
      gross_jetty_kg: gross,
      netto_jetty_kg: netto,
      cp3_timestamp:  parseJettyTime(dateStr, typeof timeStr === 'string' ? timeStr : null),
    });
  });
  return rows;
}

async function main() {
  const client = await pool.connect();
  try {
    const files = (await readdir(DATA_DIR))
      .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
      .sort();

    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalUnmatched = 0;

    for (const file of files) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(join(DATA_DIR, file));

      for (const sheet of wb.worksheets) {
        // Only process sheets with actual date data
        let dateVal = sheet.getRow(3).getCell(2).value;
        if (dateVal && typeof dateVal === 'object' && dateVal.result) dateVal = dateVal.result;
        if (!(dateVal instanceof Date)) continue;
        const dateStr = dateVal.toISOString().split('T')[0];

        const jettyRows = await parseSheet(sheet, dateStr);
        if (jettyRows.length === 0) continue;

        console.log(`\n${file} sheet ${sheet.name} (${dateStr}): ${jettyRows.length} jetty records`);

        // Load all unmatched site trips for this date from DB
        const siteTrips = await client.query(
          `select trip_id, no_lambung, cp2_timestamp, netto_site_kg, gross_site_kg
           from trips
           where date = $1 and netto_jetty_kg is null
           order by no_lambung, cp2_timestamp`,
          [dateStr]
        );

        // Group site trips by no_lambung
        const siteByTruck = new Map();
        for (const t of siteTrips.rows) {
          if (!siteByTruck.has(t.no_lambung)) siteByTruck.set(t.no_lambung, []);
          siteByTruck.get(t.no_lambung).push(t);
        }

        // Group jetty rows by no_lambung, sort by cp3_timestamp
        const jettyByTruck = new Map();
        for (const j of jettyRows) {
          if (!jettyByTruck.has(j.no_lambung)) jettyByTruck.set(j.no_lambung, []);
          jettyByTruck.get(j.no_lambung).push(j);
        }
        jettyByTruck.forEach((arr) => arr.sort((a, b) => (a.cp3_timestamp ?? 0) - (b.cp3_timestamp ?? 0)));

        let updated = 0, skipped = 0, unmatched = 0;

        for (const [lambung, jettyArr] of jettyByTruck) {
          const siteArr = siteByTruck.get(lambung);
          if (!siteArr || siteArr.length === 0) {
            unmatched += jettyArr.length;
            console.log(`  UNMATCHED: ${lambung} (${jettyArr.length} jetty records, no site trip found)`);
            continue;
          }

          // Sort site trips by cp2_timestamp
          siteArr.sort((a, b) => new Date(a.cp2_timestamp ?? 0) - new Date(b.cp2_timestamp ?? 0));

          // Match jetty records to site trips in chronological order
          // Each jetty record pairs with the next available site trip
          const usedSite = new Set();

          for (const j of jettyArr) {
            // Find the best site trip: cp2 must be before cp3, pick closest
            let bestTrip = null;
            let bestDiff = Infinity;

            for (const s of siteArr) {
              if (usedSite.has(s.trip_id)) continue;
              const cp2 = s.cp2_timestamp ? new Date(s.cp2_timestamp) : null;
              const cp3 = j.cp3_timestamp;
              if (cp2 && cp3 && cp2 < cp3) {
                const diff = cp3 - cp2;
                if (diff < bestDiff) { bestDiff = diff; bestTrip = s; }
              }
            }

            // Fallback: if no time match (missing timestamps), use sequential order
            if (!bestTrip) {
              for (const s of siteArr) {
                if (!usedSite.has(s.trip_id)) { bestTrip = s; break; }
              }
            }

            if (!bestTrip) { skipped++; continue; }

            usedSite.add(bestTrip.trip_id);

            const compareGross = j.gross_jetty_kg - (bestTrip.gross_site_kg || 0);
            const deviasi = j.netto_jetty_kg - (bestTrip.netto_site_kg || 0);

            await client.query(
              `update trips set
                 gross_jetty_kg   = $1,
                 netto_jetty_kg   = $2,
                 compare_gross_kg = $3,
                 deviasi_kg       = $4,
                 cp3_timestamp    = $5,
                 status           = 'completed'
               where trip_id = $6`,
              [j.gross_jetty_kg, j.netto_jetty_kg, compareGross, deviasi, j.cp3_timestamp, bestTrip.trip_id]
            );
            updated++;
          }

          skipped += jettyArr.length - (updated - (updated - jettyArr.length + siteArr.length > 0 ? 0 : 0));
        }

        // Recount properly
        let dayUpdated = 0;
        for (const [, jettyArr] of jettyByTruck) {
          const siteArr = siteByTruck.get(jettyByTruck.keys().next().value);
          dayUpdated += jettyArr.length;
        }

        console.log(`  updated: ${updated}, skipped: ${skipped}, unmatched: ${unmatched}`);
        totalUpdated  += updated;
        totalSkipped  += skipped;
        totalUnmatched += unmatched;
      }
    }

    console.log(`\nDone. Total updated: ${totalUpdated}, skipped: ${totalSkipped}, unmatched: ${totalUnmatched}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
