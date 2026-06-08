import ExcelJS from 'exceljs';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

// Each sheet has an opDate — the operational/shift date Talenta uses for that sheet's totals.
// Overnight entries (dateOut = next day) still belong to this opDate.
const REKAP_FILES = [
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 21 Mei 2026.xlsx'),
    sheets: [{ name: '21', opDate: '2026-05-21' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 22 Mei 2026.xlsx'),
    sheets: [{ name: '22', opDate: '2026-05-22' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 23 Mei 2026.xlsx'),
    sheets: [{ name: '23', opDate: '2026-05-23' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap Hauling MMI tgl 24 Mei 2026.xlsx'),
    sheets: [{ name: '24', opDate: '2026-05-24' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 25 Mei 2026.xlsx'),
    sheets: [{ name: '25', opDate: '2026-05-25' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 26 Mei 2026.xlsx'),
    sheets: [{ name: '26', opDate: '2026-05-26' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 28 Mei 2026.xlsx'),
    sheets: [{ name: '28', opDate: '2026-05-28' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 29 Mei 2026.xlsx'),
    sheets: [{ name: '29', opDate: '2026-05-29' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 30 Mei 2026.xlsx'),
    sheets: [{ name: '30', opDate: '2026-05-30' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 31 Mei 2026.xlsx'),
    sheets: [{ name: '31', opDate: '2026-05-31' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap hauling MMI Tanggal 1-2 Juni 2026.xlsx'),
    sheets: [{ name: '1', opDate: '2026-06-01' }, { name: '2', opDate: '2026-06-02' }],
  },
  {
    path: join(__dirname, '../../Fw_ Rekap Hauling MMI/Rekap Hauling MMI tgl 2-3 Juni 2026.xlsx'),
    sheets: [{ name: '2', opDate: '2026-06-02' }, { name: '3', opDate: '2026-06-03' }],
  },
];

function normalizeUnit(raw) {
  const s = raw.trim().toUpperCase();
  if (/^\.\d+$/.test(s)) return 'PJM ' + s.slice(1).padStart(3, '0');
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

// Step 1: parse all rekap files into a single deduplicated list keyed by ticket number.
// jetty_date = the sheet's opDate (operational shift date), matching how Talenta totals each day.
// dateOut from the row is kept only for time-based matching against cp2_timestamp.
async function buildConsolidatedRekap() {
  const seen = new Set();
  const rows = [];
  let duplicates = 0;

  for (const file of REKAP_FILES) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file.path);

    for (const { name: sheetName, opDate } of file.sheets) {
      const sheet = wb.getWorksheet(sheetName);
      if (!sheet) continue;

      for (let i = 5; i <= 2000; i++) {
        const row = sheet.getRow(i);
        const ticket = row.getCell(2).value;
        if (!ticket || typeof ticket !== 'string') break;

        if (seen.has(ticket)) { duplicates++; continue; }
        seen.add(ticket);

        const unit = normalizeUnit(String(row.getCell(3).value || ''));
        const dateOut = parseDateOut(row.getCell(4));   // actual calendar date — for matching only
        const timeOutMins = parseTimeOutMins(row.getCell(5));
        const gross = Number(row.getCell(7).value);
        const nettoRaw = row.getCell(9).value;
        const netto = Number(nettoRaw?.result ?? nettoRaw);
        if (!unit || !gross) continue;

        rows.push({ ticket, no_lambung: unit, opDate, dateOut, timeOutMins, gross_jetty_kg: gross, netto_jetty_kg: netto });
      }
    }
  }

  // Sort by opDate then timeOutMins
  rows.sort((a, b) => {
    if (a.opDate !== b.opDate) return a.opDate < b.opDate ? -1 : 1;
    return (a.timeOutMins ?? 0) - (b.timeOutMins ?? 0);
  });

  console.log(`Rekap: ${rows.length} unique entries, ${duplicates} duplicates removed`);
  return rows;
}

async function main() {
  const client = await pool.connect();

  try {
    const rekapRows = await buildConsolidatedRekap();

    // Step 2: load all unmatched trips in the full date window.
    // Use opDate range (±1 day buffer) since overnight entries belong to the previous opDate.
    const opDates = [...new Set(rekapRows.map(r => r.opDate))].sort();
    const prevDay = new Date(opDates[0] + 'T00:00:00Z');
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const dateMin = prevDay.toISOString().split('T')[0];
    // dateMax extends one day past last opDate to catch overnight entries
    const lastOpDay = new Date(opDates[opDates.length - 1] + 'T00:00:00Z');
    lastOpDay.setUTCDate(lastOpDay.getUTCDate() + 1);
    const dateMax = lastOpDay.toISOString().split('T')[0];

    const dbRes = await client.query(
      `SELECT trip_id, date::text AS date, no_lambung,
              extract(epoch from cp2_timestamp) AS cp2_utc_epoch
       FROM trips
       WHERE date BETWEEN $1 AND $2 AND gross_jetty_kg IS NULL
       ORDER BY date, no_tiket`,
      [dateMin, dateMax]
    );

    // Build index: normalized unit → [{trip_id, date, cp2_utc_epoch}]
    const dbIndex = {};
    for (const row of dbRes.rows) {
      const key = normalizeUnit(row.no_lambung);
      if (!dbIndex[key]) dbIndex[key] = [];
      dbIndex[key].push({
        trip_id: row.trip_id,
        date: row.date,
        cp2_utc_epoch: row.cp2_utc_epoch ? Number(row.cp2_utc_epoch) : null,
      });
    }

    console.log(`DB: ${dbRes.rows.length} unmatched trips to fill\n`);

    // Step 3: match each consolidated rekap row to a DB trip
    let updated = 0;
    let unmatched = 0;

    for (const r of rekapRows) {
      const candidates = dbIndex[r.no_lambung];
      if (!candidates || candidates.length === 0) {
        unmatched++;
        continue;
      }

      // Convert actual jetty exit time (dateOut) to UTC epoch for cp2 comparison.
      const refDate = r.dateOut || r.opDate;
      const [y, mo, d] = refDate.split('-').map(Number);
      const rekapUtcEpoch = r.timeOutMins !== null
        ? Date.UTC(y, mo - 1, d, 0, 0, 0) / 1000 + r.timeOutMins * 60 - 8 * 3600
        : null;

      // cp3 (jetty exit) must be AFTER cp2 (MMI departure).
      // Overnight: before 08:00 WITA means the truck loaded at MMI the previous opDate.
      const CUTOFF_WITA_MINS = 8 * 60;
      const isOvernight = r.timeOutMins !== null && r.timeOutMins < CUTOFF_WITA_MINS;

      const validCandidates = candidates.filter(c => {
        if (c.cp2_utc_epoch !== null && rekapUtcEpoch !== null) {
          return rekapUtcEpoch > c.cp2_utc_epoch;
        }
        return isOvernight ? c.date < r.opDate : c.date <= r.opDate;
      });

      const matchPool = validCandidates.length > 0 ? validCandidates : candidates;

      let match;
      if (matchPool.length === 1) {
        match = matchPool[0];
      } else if (rekapUtcEpoch !== null) {
        match = matchPool.reduce((best, c) => {
          const gapC = c.cp2_utc_epoch !== null ? rekapUtcEpoch - c.cp2_utc_epoch : Infinity;
          const gapB = best.cp2_utc_epoch !== null ? rekapUtcEpoch - best.cp2_utc_epoch : Infinity;
          if (gapC >= 0 && (gapB < 0 || gapC < gapB)) return c;
          if (gapB >= 0) return best;
          return Math.abs(gapC) < Math.abs(gapB) ? c : best;
        });
      } else {
        match = matchPool[0];
      }

      dbIndex[r.no_lambung] = candidates.filter(c => c.trip_id !== match.trip_id);

      await client.query(
        `UPDATE trips SET
           gross_jetty_kg   = $1,
           netto_jetty_kg   = $2,
           compare_gross_kg = gross_site_kg - $1,
           deviasi_kg       = netto_site_kg - $2,
           jetty_date       = $3
         WHERE trip_id = $4`,
        [r.gross_jetty_kg, r.netto_jetty_kg, r.opDate, match.trip_id]
      );
      updated++;
    }

    console.log(`Updated: ${updated}, unmatched rekap rows: ${unmatched}`);

    // Step 4: report
    const unfilledRes = await client.query(
      `SELECT date, COUNT(*) as missing FROM trips
       WHERE date BETWEEN '2026-05-21' AND '2026-06-05' AND netto_jetty_kg IS NULL
       GROUP BY date ORDER BY date`
    );
    if (unfilledRes.rows.length > 0) {
      console.log('\nTrips still missing jetty weights:');
      for (const r of unfilledRes.rows) console.log(`  ${r.date}: ${r.missing}`);
    } else {
      console.log('\nAll trips matched.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
