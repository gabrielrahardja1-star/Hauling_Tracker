import 'dotenv/config';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import { createClient } from '@clickhouse/client';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIRS = [
  join(__dirname, '../../Historical Hauling Data '),
  join(__dirname, '../../Fw_ Rekap Hauling MMI'),
];

const chClient = createClient({
  url: process.env.DATABASE_URL || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DB || 'hauling_tracker',
  clickhouse_settings: { date_time_output_format: 'iso' },
});

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
  const [y, m, d] = dateStr.split('-').map(Number);
  const wita = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
  return new Date(wita.getTime() - 8 * 60 * 60 * 1000).toISOString();
}

function extractDate(row2) {
  const v = row2.getCell(1).value;
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'string') return v.split('T')[0];
  return null;
}

function coalQuality(raw) {
  if (raw === '精煤') return 'clean';
  if (raw === '原煤') return 'raw';
  return 'clean';
}

async function parseFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet('Sheet1');

  if (!sheet) {
    console.log(`  skipping (no Sheet1 — unrecognised format)`);
    return [];
  }

  const qualityRaw = sheet.getRow(1).getCell(7).value;
  const quality = coalQuality(qualityRaw);

  const dateStr = extractDate(sheet.getRow(2));
  if (!dateStr) throw new Error(`Could not extract date from ${filePath}`);

  const trips = [];

  sheet.eachRow((row, rn) => {
    if (rn < 5) return;
    const noTiket = row.getCell(1).value;
    if (typeof noTiket !== 'number') return;

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
  try {
    const allFiles = [];
    for (const dir of DATA_DIRS) {
      const names = (await readdir(dir))
        .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
        .sort();
      allFiles.push(...names.map(f => join(dir, f)));
    }

    console.log(`Found ${allFiles.length} files across ${DATA_DIRS.length} directories`);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const filePath of allFiles) {
      const trips = await parseFile(filePath);
      const file = filePath.split('/').pop();
      console.log(`\n${file}: ${trips.length} trips for ${trips[0]?.date}`);

      let inserted = 0;
      let skipped = 0;

      for (const t of trips) {
        try {
          const result = await chClient.query({
            query: `SELECT 1 FROM trips FINAL WHERE date = {d: Date} AND no_tiket = {t: Int32} LIMIT 1`,
            query_params: { d: t.date, t: t.no_tiket },
            format: 'JSONEachRow',
          });
          const existing = await result.json();
          if (existing.length > 0) {
            skipped++;
            continue;
          }

          const now = new Date().toISOString();
          await chClient.insert({
            table: 'trips',
            values: [{
              trip_id:           randomUUID(),
              date:              t.date,
              status:            t.status,
              no_tiket:          t.no_tiket,
              no_lambung:        t.no_lambung,
              jetty_destination: t.jetty_destination,
              coal_quality:      t.coal_quality,
              cuaca_mmi:         t.cuaca_mmi,
              tare_site_kg:      t.tare_site_kg,
              cp1_timestamp:     t.cp1_timestamp,
              gross_site_kg:     t.gross_site_kg,
              netto_site_kg:     t.netto_site_kg,
              cp2_timestamp:     t.cp2_timestamp,
              gross_jetty_kg:    null,
              netto_jetty_kg:    null,
              compare_gross_kg:  null,
              deviasi_kg:        null,
              cp3_timestamp:     null,
              adjustment_kg:     0,
              _updated_at:       now,
            }],
            format: 'JSONEachRow',
          });
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
    await chClient.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
