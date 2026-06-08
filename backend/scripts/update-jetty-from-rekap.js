import ExcelJS from 'exceljs';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

// Each entry: path + which sheet names to process.
// Sheets with a date number (e.g. '24') are single-day consolidated.
// Multi-day files (e.g. '2-3 Juni') use numbered sheets ('2','3') where
// each sheet may span into the next calendar day for overnight trips.
const REKAP_FILES = [
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 21 Mei 2026.xlsx'),
    sheets: ['21'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 22 Mei 2026.xlsx'),
    sheets: ['22'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 23 Mei 2026.xlsx'),
    sheets: ['23'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap Hauling MMI tgl 24 Mei 2026.xlsx'),
    sheets: ['24'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 25 Mei 2026.xlsx'),
    sheets: ['25'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 26 Mei 2026.xlsx'),
    sheets: ['26'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 28 Mei 2026.xlsx'),
    sheets: ['28'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 29 Mei 2026.xlsx'),
    sheets: ['29'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 30 Mei 2026.xlsx'),
    sheets: ['30'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 31 Mei 2026.xlsx'),
    sheets: ['31'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 1-2 Juni 2026.xlsx'),
    sheets: ['1', '2'],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap Hauling MMI tgl 2-3 Juni 2026.xlsx'),
    sheets: ['2', '3'],
  },
];

function normalizeUnit(raw) {
  const s = raw.trim().toUpperCase();
  // ".07" / ".082" style (Chinese fleet format) → "PJM 007" / "PJM 082"
  if (/^\.\d+$/.test(s)) return 'PJM ' + s.slice(1).padStart(3, '0');
  // "PJM007" / "PJM 07" → "PJM 007"
  const m = s.match(/^([A-Z]+)\s*(\d+)$/);
  if (m) return m[1] + ' ' + m[2].padStart(3, '0');
  return s;
}

function parseDateOut(cell) {
  const v = cell.value;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'string' && v.includes('-')) return v.split('T')[0];
  return null;
}

function parseTimeOutMins(cell) {
  const v = cell.value;
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes();
  if (typeof v === 'string') {
    const [hh, mm] = v.split(':').map(Number);
    return isNaN(hh) ? null : hh * 60 + mm;
  }
  return null;
}

async function parseSheet(sheet) {
  const rows = [];
  for (let i = 5; i <= 2000; i++) {
    const row = sheet.getRow(i);
    const ticket = row.getCell(2).value;
    if (!ticket || typeof ticket !== 'string') break;
    const unit = normalizeUnit(String(row.getCell(3).value || ''));
    const dateOut = parseDateOut(row.getCell(4));
    const timeOutMins = parseTimeOutMins(row.getCell(5));
    const gross = Number(row.getCell(7).value);
    const nettoRaw = row.getCell(9).value;
    const netto = Number(nettoRaw?.result ?? nettoRaw);
    if (!unit || !dateOut || !gross) continue;
    rows.push({ no_lambung: unit, dateOut, timeOutMins, gross_jetty_kg: gross, netto_jetty_kg: netto });
  }
  return rows;
}

async function main() {
  const client = await pool.connect();
  let totalUpdated = 0;
  let totalUnmatched = 0;

  try {
    for (const file of REKAP_FILES) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(file.path);
      console.log(`\n${file.path.split('/').pop()}`);

      for (const sheetName of file.sheets) {
        const sheet = wb.getWorksheet(sheetName);
        if (!sheet) { console.log(`  sheet "${sheetName}" not found, skipping`); continue; }

        const rekapRows = await parseSheet(sheet);
        if (rekapRows.length === 0) { console.log(`  sheet "${sheetName}": no data rows`); continue; }

        const dates = [...new Set(rekapRows.map(r => r.dateOut))].sort();
        const dateMax = dates[dates.length - 1];
        // Extend search window one day earlier to catch overnight trips
        const prevDay = new Date(dates[0] + 'T00:00:00Z');
        prevDay.setUTCDate(prevDay.getUTCDate() - 1);
        const dateMin = prevDay.toISOString().split('T')[0];

        console.log(`  sheet "${sheetName}": ${rekapRows.length} rows, jetty dates ${dates[0]}–${dateMax}`);

        // Load all unmatched trips in the date window
        const dbTrips = await client.query(
          `SELECT trip_id, date::text, no_lambung,
                  extract(epoch from cp2_timestamp) AS cp2_utc_epoch
           FROM trips
           WHERE date BETWEEN $1 AND $2 AND gross_jetty_kg IS NULL
           ORDER BY date, no_tiket`,
          [dateMin, dateMax]
        );

        // Index: normalized no_lambung → [{trip_id, date, cp2_utc_epoch}]
        const dbIndex = {};
        for (const row of dbTrips.rows) {
          const key = normalizeUnit(row.no_lambung);
          if (!dbIndex[key]) dbIndex[key] = [];
          dbIndex[key].push({
            trip_id: row.trip_id,
            date: row.date,
            cp2_utc_epoch: row.cp2_utc_epoch ? Number(row.cp2_utc_epoch) : null,
          });
        }

        let updated = 0;
        let unmatched = 0;

        for (const r of rekapRows) {
          const candidates = dbIndex[r.no_lambung];
          if (!candidates || candidates.length === 0) {
            console.warn(`  no match: ${r.no_lambung} (jetty date ${r.dateOut})`);
            unmatched++;
            continue;
          }

          let match;
          if (candidates.length === 1) {
            match = candidates[0];
          } else {
            // Convert rekap dateOut + timeOutMins from WITA (UTC+8) to UTC epoch
            // Jetty time should always be after the truck's MMI departure (cp2)
            const [y, mo, d] = r.dateOut.split('-').map(Number);
            const rekapUtcEpoch = r.timeOutMins !== null
              ? Date.UTC(y, mo - 1, d, 0, 0, 0) / 1000 + r.timeOutMins * 60 - 8 * 3600
              : null;

            if (rekapUtcEpoch !== null) {
              // Pick candidate where cp2 is before jetty time and the gap is smallest
              match = candidates.reduce((best, c) => {
                const gapC = c.cp2_utc_epoch !== null ? rekapUtcEpoch - c.cp2_utc_epoch : Infinity;
                const gapB = best.cp2_utc_epoch !== null ? rekapUtcEpoch - best.cp2_utc_epoch : Infinity;
                // Prefer positive gaps (cp2 before jetty time), then smallest gap
                if (gapC >= 0 && (gapB < 0 || gapC < gapB)) return c;
                if (gapB >= 0) return best;
                return Math.abs(gapC) < Math.abs(gapB) ? c : best;
              });
            } else {
              match = candidates[0];
            }
          }

          // Consume this candidate so it can't be matched twice
          dbIndex[r.no_lambung] = candidates.filter(c => c.trip_id !== match.trip_id);

          await client.query(
            `UPDATE trips SET
               gross_jetty_kg   = $1,
               netto_jetty_kg   = $2,
               compare_gross_kg = gross_site_kg - $1,
               deviasi_kg       = netto_site_kg - $2
             WHERE trip_id = $3`,
            [r.gross_jetty_kg, r.netto_jetty_kg, match.trip_id]
          );
          updated++;
        }

        console.log(`  updated: ${updated}, unmatched: ${unmatched}`);
        totalUpdated += updated;
        totalUnmatched += unmatched;
      }
    }

    console.log(`\nDone. Total updated: ${totalUpdated}, unmatched: ${totalUnmatched}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
