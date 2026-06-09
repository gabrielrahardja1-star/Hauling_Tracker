import 'dotenv/config';
import { randomUUID } from 'crypto';
import { createClient } from '@clickhouse/client';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const chClient = createClient({
  url: process.env.DATABASE_URL || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DB || 'hauling_tracker',
  clickhouse_settings: { date_time_output_format: 'iso' },
});

// SQLite stores timestamps in WITA (UTC+8); append offset and let Date parse it.
function witaToUtc(s) {
  if (!s) return null;
  return new Date(s.replace(' ', 'T') + '+08:00').toISOString();
}

async function main() {
  try {
    const raw = await readFile(join(__dirname, 'cleaned-data.json'), 'utf8');
    const rows = JSON.parse(raw);
    console.log(`Loaded ${rows.length} records from cleaned-data.json`);

    let inserted = 0;
    let skipped  = 0;
    const now = new Date().toISOString();

    for (const r of rows) {
      try {
        const check = await chClient.query({
          query: `SELECT 1 FROM trips FINAL
                  WHERE date = {d: Date} AND no_tiket = {t: Int32} LIMIT 1`,
          query_params: { d: r.site_date, t: r.site_ticket_no },
          format: 'JSONEachRow',
        });
        const existing = await check.json();
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await chClient.insert({
          table: 'trips',
          values: [{
            trip_id:           randomUUID(),
            date:              r.site_date,
            status:            'completed',
            no_tiket:          r.site_ticket_no,
            no_lambung:        r.no_lambung,
            jetty_destination: 'talenta',
            coal_quality:      'clean',
            cuaca_mmi:         r.site_weather ?? '',
            tare_site_kg:      r.tare_site_kg,
            cp1_timestamp:     witaToUtc(r.site_enter_dt),
            gross_site_kg:     r.gross_site_kg,
            netto_site_kg:     r.netto_site_kg,
            cp2_timestamp:     witaToUtc(r.site_leave_dt),
            gross_jetty_kg:    r.gross_jetty_kg,
            netto_jetty_kg:    r.netto_jetty_kg,
            compare_gross_kg:  r.compare_gross_kg,
            deviasi_kg:        r.deviasi_kg,
            cp3_timestamp:     witaToUtc(r.jetty_dt),
            adjustment_kg:     0,
            _updated_at:       now,
          }],
          format: 'JSONEachRow',
        });
        inserted++;

        if (inserted % 100 === 0) {
          console.log(`  progress: ${inserted} inserted, ${skipped} skipped`);
        }
      } catch (err) {
        console.warn(`  skip ${r.no_lambung} ${r.site_date}: ${err.message}`);
        skipped++;
      }
    }

    console.log(`\nDone. Inserted: ${inserted}, skipped (already existed): ${skipped}`);
  } finally {
    await chClient.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
