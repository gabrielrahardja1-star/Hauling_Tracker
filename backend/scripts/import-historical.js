import ExcelJS from 'exceljs';
import pg from 'pg';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../Historical Hauling Data ');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres:///hauling_tracker',
  ssl: false,
});

// Excel stores times as fractional days from 1899-12-30
// Combine with a real date string to get a proper timestamp
function excelTimeToTimestamp(dateStr, excelTime) {
  if (!excelTime) return null;
  let hours, minutes;
  if (excelTime instanceof Date) {
    hours = excelTime.getUTCHours();
    minutes = excelTime.getUTCMinutes();
  } else if (typeof excelTime === 'number') {
    const totalMinutes = Math.round(excelTime * 24 * 60);
    hours = Math.floor(totalMinutes / 60) % 24;
    minutes = totalMinutes % 60;
  } else {
    return null;
  }
  // dateStr is WITA (UTC+8), store as UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  const wita = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
  const utc = new Date(wita.getTime() - 8 * 60 * 60 * 1000);
  return utc.toISOString();
}

function extractDate(row2) {
  // Cell 1 of row 2 is the date
  const v = row2.getCell(1).value;
  if (v instanceof Date) {
    return v.toISOString().split('T')[0];
  }
  if (typeof v === 'string') {
    return v.split('T')[0];
  }
  return null;
}

function coalQuality(raw) {
  if (raw === '精煤') return 'clean';
  if (raw === '原煤') return 'raw';
  return 'clean'; // default
}

async function parseFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet('Sheet1');

  if (!sheet) {
    console.log(`  skipping (no Sheet1 — unrecognised format)`);
    return [];
  }

  // Coal quality is in row 1 col 7
  const qualityRaw = sheet.getRow(1).getCell(7).value;
  const quality = coalQuality(qualityRaw);

  // Date is in row 2 col 1
  const dateStr = extractDate(sheet.getRow(2));
  if (!dateStr) throw new Error(`Could not extract date from ${filePath}`);

  const trips = [];

  sheet.eachRow((row, rn) => {
    if (rn < 5) return; // skip headers
    const noTiket = row.getCell(1).value;
    if (typeof noTiket !== 'number') return; // skip totals row

    const noLambung = String(row.getCell(2).value || '').trim().toUpperCase();
    const cp1Time = row.getCell(3).value;
    const cp2Time = row.getCell(4).value;
    const grossSite = row.getCell(5).value;
    const tareSite = row.getCell(6).value;
    const nettoCell = row.getCell(7).value;
    const nettoSite = nettoCell?.result ?? nettoCell;
    const cuaca = String(row.getCell(8).value || '').trim();

    trips.push({
      date: dateStr,
      no_tiket: noTiket,
      no_lambung: noLambung,
      jetty_destination: 'talenta',
      coal_quality: quality,
      cuaca_mmi: cuaca,
      tare_site_kg: Number(tareSite),
      gross_site_kg: Number(grossSite),
      netto_site_kg: Number(nettoSite),
      cp1_timestamp: excelTimeToTimestamp(dateStr, cp1Time),
      cp2_timestamp: excelTimeToTimestamp(dateStr, cp2Time),
      status: 'completed',
    });
  });

  return trips;
}

async function main() {
  const client = await pool.connect();
  try {
    const files = (await readdir(DATA_DIR))
      .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
      .sort();

    console.log(`Found ${files.length} files in ${DATA_DIR}`);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const file of files) {
      const trips = await parseFile(join(DATA_DIR, file));
      console.log(`\n${file}: ${trips.length} trips for ${trips[0]?.date}`);

      let inserted = 0;
      let skipped = 0;

      for (const t of trips) {
        try {
          await client.query(
            `insert into trips
               (date, no_tiket, no_lambung, jetty_destination, coal_quality,
                cuaca_mmi, tare_site_kg, gross_site_kg, netto_site_kg,
                cp1_timestamp, cp2_timestamp, status)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             on conflict (date, no_tiket) do nothing`,
            [
              t.date, t.no_tiket, t.no_lambung, t.jetty_destination,
              t.coal_quality, t.cuaca_mmi, t.tare_site_kg,
              t.gross_site_kg, t.netto_site_kg,
              t.cp1_timestamp, t.cp2_timestamp, t.status,
            ]
          );
          inserted++;
        } catch (err) {
          console.warn(`  skip ${t.no_lambung} ${t.date}: ${err.message}`);
          skipped++;
        }
      }

      console.log(`  inserted: ${inserted}, skipped: ${skipped}`);
      totalInserted += inserted;
      totalSkipped += skipped;
    }

    console.log(`\nDone. Total inserted: ${totalInserted}, skipped: ${totalSkipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
