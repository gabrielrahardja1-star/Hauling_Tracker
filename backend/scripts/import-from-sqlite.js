import 'dotenv/config';
import { randomUUID } from 'crypto';
import pg from 'pg';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// SQLite stores timestamps as WITA (UTC+8); append offset so Postgres stores as UTC.
function witaToUtc(s) {
  if (!s) return null;
  return new Date(s.replace(' ', 'T') + '+08:00').toISOString();
}

async function main() {
  const client = await pool.connect();
  try {
    const raw = await readFile(join(__dirname, 'cleaned-data.json'), 'utf8');
    const rows = JSON.parse(raw);
    console.log(`Loaded ${rows.length} records from cleaned-data.json`);

    let inserted = 0;
    let skipped  = 0;

    for (const r of rows) {
      const { rows: existing } = await client.query(
        'SELECT 1 FROM trips WHERE date = $1 AND no_tiket = $2 LIMIT 1',
        [r.site_date, r.site_ticket_no]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO trips (
          trip_id, date, status, no_tiket, no_lambung,
          jetty_destination, coal_quality, cuaca_mmi,
          tare_site_kg, cp1_timestamp, gross_site_kg, netto_site_kg, cp2_timestamp,
          gross_jetty_kg, netto_jetty_kg, compare_gross_kg, deviasi_kg, cp3_timestamp,
          adjustment_kg, jetty_date
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
        )`,
        [
          randomUUID(),
          r.site_date,
          'completed',
          r.site_ticket_no,
          r.no_lambung,
          'talenta',
          'clean',
          r.site_weather ?? '',
          r.tare_site_kg,
          witaToUtc(r.site_enter_dt),
          r.gross_site_kg,
          r.netto_site_kg,
          witaToUtc(r.site_leave_dt),
          r.gross_jetty_kg,
          r.netto_jetty_kg,
          r.compare_gross_kg,
          r.deviasi_kg,
          witaToUtc(r.jetty_dt),
          0,
          r.site_date,  // jetty_date same as site_date for historical data
        ]
      );
      inserted++;

      if (inserted % 100 === 0) {
        console.log(`  progress: ${inserted} inserted, ${skipped} skipped`);
      }
    }

    console.log(`\nDone. Inserted: ${inserted}, skipped (already existed): ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
