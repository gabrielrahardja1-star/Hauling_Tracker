// One-off backfill: pushes a weighbridge station's locally-recorded tickets
// (tickets.json) into the real trips table, for whichever ones aren't
// already there. Skips anything that already exists (matched by plate +
// exact tare/gross, since a plate can legitimately have multiple trips in
// one day) so it's safe to re-run. Talks to the LOCAL backend on this same
// server via the station API (same auth/idempotency path a real station
// uses) — not raw SQL inserts — so session creation, ticket numbering, and
// status transitions all go through the exact same code path as a live
// weighing.
//
// Usage (run from backend/, so it picks up backend/.env for DATABASE_URL):
//   node scripts/pc2-backfill.mjs /path/to/tickets.json --dry-run
//   node scripts/pc2-backfill.mjs /path/to/tickets.json
//
// Fixed values confirmed for all of this station's trucks today:
const JETTY = 'talenta';
const COAL_QUALITY = 'premium';
const CUACA = 'Cerah';

import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';

const STATION_KEY = process.env.WEIGHBRIDGE_STATION_KEY;
const BASE = 'http://localhost:3002';
const dryRun = process.argv.includes('--dry-run');
const ticketsPath = process.argv[2];

if (!ticketsPath || ticketsPath.startsWith('--')) {
  console.error('Usage: node scripts/pc2-backfill.mjs /path/to/tickets.json [--dry-run]');
  process.exit(1);
}
if (!STATION_KEY) {
  console.error('WEIGHBRIDGE_STATION_KEY not set (should come from backend/.env).');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const raw = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
const tickets = raw.tickets.filter((t) => !(t.gross === 0 && t.tare === 0)); // drop test junk (0/0)

console.log(`${dryRun ? '[DRY RUN] ' : ''}${tickets.length} real tickets to check.\n`);

async function alreadyExists(noPolisi, tare, gross) {
  const { rows } = await pool.query(
    `select trip_id, no_tiket from trips where no_lambung = $1 and tare_site_kg = $2 and gross_site_kg = $3`,
    [noPolisi.trim().toUpperCase(), tare, gross]
  );
  return rows[0] || null;
}

async function call(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-station-key': STATION_KEY },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let created = 0, skipped = 0, failed = 0;

for (const t of tickets) {
  const existing = await alreadyExists(t.noPolisi, t.tare, t.gross);
  if (existing) {
    console.log(`SKIP  ${t.noPolisi.padEnd(10)} tare=${t.tare} gross=${t.gross} — already exists as no_tiket ${existing.no_tiket}`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`WOULD CREATE  ${t.noPolisi.padEnd(10)} tare=${t.tare} gross=${t.gross} netto=${t.netto}  waktu1=${t.waktu1} waktu2=${t.waktu2}`);
    created++;
    continue;
  }

  try {
    const trip = await call('POST', '/station/trips', {
      no_lambung: t.noPolisi,
      jetty_destination: JETTY,
      coal_quality: COAL_QUALITY,
      cuaca_mmi: CUACA,
      tare_site_kg: t.tare,
      measured_at: t.waktu1,
    });
    await call('PATCH', `/station/trips/${trip.trip_id}/cp2`, {
      gross_site_kg: t.gross,
      measured_at: t.waktu2,
    });
    console.log(`CREATED  ${t.noPolisi.padEnd(10)} tare=${t.tare} gross=${t.gross} -> no_tiket ${trip.no_tiket}`);
    created++;
  } catch (err) {
    console.error(`FAILED   ${t.noPolisi.padEnd(10)} ${err.message}`);
    failed++;
  }
}

console.log(`\n${dryRun ? 'Would create' : 'Created'}: ${created}  |  Already existed (skipped): ${skipped}  |  Failed: ${failed}`);
await pool.end();
