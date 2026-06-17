import 'dotenv/config';
import ExcelJS from 'exceljs';
import { createClient } from '@clickhouse/client';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../Fw_ Rekap Hauling MMI');

const chClient = createClient({
  url: process.env.DATABASE_URL || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DB || 'hauling_tracker',
  clickhouse_settings: { date_time_output_format: 'iso' },
});

function parseJettyTime(dateStr, timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, 0)).toISOString();
}

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
      no_lambung:     normalizeLambung(unit),
      gross_jetty_kg: gross,
      netto_jetty_kg: netto,
      cp3_timestamp:  parseJettyTime(dateStr, typeof timeStr === 'string' ? timeStr : null),
    });
  });
  return rows;
}

async function main() {
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
        let dateVal = sheet.getRow(3).getCell(2).value;
        if (dateVal && typeof dateVal === 'object' && dateVal.result) dateVal = dateVal.result;
        if (!(dateVal instanceof Date)) continue;
        const dateStr = dateVal.toISOString().split('T')[0];

        const jettyRows = await parseSheet(sheet, dateStr);
        if (jettyRows.length === 0) continue;

        console.log(`\n${file} sheet ${sheet.name} (${dateStr}): ${jettyRows.length} jetty records`);

        // Load all unmatched site trips for this date (full row needed for re-insert)
        const result = await chClient.query({
          query: `SELECT * FROM trips FINAL
                  WHERE date = {d: Date} AND netto_jetty_kg IS NULL
                  ORDER BY no_lambung, cp2_timestamp`,
          query_params: { d: dateStr },
          format: 'JSONEachRow',
        });
        const siteTrips = await result.json();

        const siteByTruck = new Map();
        for (const t of siteTrips) {
          if (!siteByTruck.has(t.no_lambung)) siteByTruck.set(t.no_lambung, []);
          siteByTruck.get(t.no_lambung).push(t);
        }

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

          siteArr.sort((a, b) => new Date(a.cp2_timestamp ?? 0) - new Date(b.cp2_timestamp ?? 0));

          const usedSite = new Set();

          for (const j of jettyArr) {
            let bestTrip = null;
            let bestDiff = Infinity;

            for (const s of siteArr) {
              if (usedSite.has(s.trip_id)) continue;
              const cp2 = s.cp2_timestamp ? new Date(s.cp2_timestamp) : null;
              const cp3 = j.cp3_timestamp ? new Date(j.cp3_timestamp) : null;
              if (cp2 && cp3 && cp2 < cp3) {
                const diff = cp3 - cp2;
                if (diff < bestDiff) { bestDiff = diff; bestTrip = s; }
              }
            }

            if (!bestTrip) {
              for (const s of siteArr) {
                if (!usedSite.has(s.trip_id)) { bestTrip = s; break; }
              }
            }

            if (!bestTrip) { skipped++; continue; }

            usedSite.add(bestTrip.trip_id);

            const compareGross = j.gross_jetty_kg - (bestTrip.gross_site_kg || 0);
            const deviasi = j.netto_jetty_kg - (bestTrip.netto_site_kg || 0);
            const now = new Date().toISOString();

            await chClient.insert({
              table: 'trips',
              values: [{
                ...bestTrip,
                gross_jetty_kg:   j.gross_jetty_kg,
                netto_jetty_kg:   j.netto_jetty_kg,
                compare_gross_kg: compareGross,
                deviasi_kg:       deviasi,
                cp3_timestamp:    j.cp3_timestamp,
                status:           'completed',
                _updated_at:      now,
              }],
              format: 'JSONEachRow',
            });
            updated++;
          }

          skipped += jettyArr.length - updated;
        }

        console.log(`  updated: ${updated}, skipped: ${skipped}, unmatched: ${unmatched}`);
        totalUpdated  += updated;
        totalSkipped  += skipped;
        totalUnmatched += unmatched;
      }
    }

    console.log(`\nDone. Total updated: ${totalUpdated}, skipped: ${totalSkipped}, unmatched: ${totalUnmatched}`);
  } finally {
    await chClient.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
