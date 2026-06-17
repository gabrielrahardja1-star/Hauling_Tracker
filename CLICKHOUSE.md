# ClickHouse Setup & Usage

> **Note:** Production uses Postgres. ClickHouse is available for local development and analytics via the `docker-compose.yml` in the project root.

---

## Local Setup

**Prerequisites:** Docker Desktop running.

```bash
# Copy env file and fill in values
cp .env.example .env

# Start ClickHouse only
docker compose up clickhouse -d

# Verify it's healthy
curl http://localhost:8123/ping
```

ClickHouse will auto-create the `hauling_tracker` database and `trips`/`users`/`barge_loadings` tables from `clickhouse/schema.sql`.

---

## Connection Details

| Setting | Value |
|---|---|
| HTTP port | `8123` |
| Native TCP port | `9000` |
| User | `hauling_user` |
| Password | value of `DB_PASSWORD` in `.env` |
| Database | `hauling_tracker` |

HTTP URL: `http://hauling_user:YOUR_PASSWORD@localhost:8123`

---

## Backend (local ClickHouse mode)

Update `backend/.env` to point at ClickHouse:

```env
DATABASE_URL=http://hauling_user:YOUR_PASSWORD@localhost:8123
CLICKHOUSE_DB=hauling_tracker
```

Then start the backend normally:

```bash
cd backend && npm run dev
```

---

## Import Scripts

All scripts live in `backend/scripts/`. Run from the `backend/` directory.

### Import historical site data (Excel files)
Reads from `Historical Hauling Data /` and `Fw_ Rekap Hauling MMI/`.

```bash
DATABASE_URL=http://hauling_user:YOUR_PASSWORD@localhost:8123 \
CLICKHOUSE_DB=hauling_tracker \
node scripts/import-historical.js
```

### Import jetty weights from rekap files
Matches jetty records to existing site trips by truck + date.

```bash
DATABASE_URL=http://hauling_user:YOUR_PASSWORD@localhost:8123 \
CLICKHOUSE_DB=hauling_tracker \
node scripts/import-jetty.js
```

### Import from cleaned/reconciled SQLite
Reads from `backend/scripts/cleaned-data.json` (exported from `Cleaned Data/hauling_reconciliation.sqlite`).
Inserts new trips and patches missing jetty data on existing ones.

```bash
DATABASE_URL=http://hauling_user:YOUR_PASSWORD@localhost:8123 \
CLICKHOUSE_DB=hauling_tracker \
node scripts/import-from-sqlite.js
```

---

## Useful Queries

Connect via HTTP (returns JSON):

```bash
curl "http://hauling_user:YOUR_PASSWORD@localhost:8123/" \
  --data "SELECT date, count(), sum(netto_site_kg)/1000 AS site_mt, sum(netto_jetty_kg)/1000 AS jetty_mt FROM hauling_tracker.trips FINAL GROUP BY date ORDER BY date FORMAT PrettyCompact"
```

Or use the ClickHouse CLI inside Docker:

```bash
docker compose exec clickhouse clickhouse-client \
  --user hauling_user --password YOUR_PASSWORD \
  --database hauling_tracker \
  --query "SELECT count() FROM trips FINAL"
```

### Common queries

```sql
-- Trip count and tonnage by date
SELECT date, count() AS trips,
       sum(netto_site_kg)/1000 AS site_mt,
       sum(netto_jetty_kg)/1000 AS jetty_mt
FROM trips FINAL
GROUP BY date ORDER BY date;

-- Trips missing jetty data
SELECT date, count() AS trips
FROM trips FINAL
WHERE netto_jetty_kg IS NULL
GROUP BY date ORDER BY date;

-- Total tonnage summary
SELECT sum(netto_site_kg)/1000 AS total_site_mt,
       sum(netto_jetty_kg)/1000 AS total_jetty_mt
FROM trips FINAL
WHERE status = 'completed';
```

---

## Re-exporting cleaned-data.json

If `Cleaned Data/hauling_reconciliation copy.sqlite` is updated, regenerate the JSON:

```bash
sqlite3 -json "Cleaned Data/hauling_reconciliation copy.sqlite" "
SELECT
  se.site_date, se.site_ticket_no,
  se.site_truck_normalized as no_lambung,
  se.site_weather,
  CAST(se.site_tare_kg AS INTEGER) as tare_site_kg,
  se.site_enter_dt, CAST(se.site_gross_kg AS INTEGER) as gross_site_kg,
  CAST(se.site_netto_kg AS INTEGER) as netto_site_kg, se.site_leave_dt,
  CAST(je.jetty_gross_kg AS INTEGER) as gross_jetty_kg,
  CAST(je.jetty_netto_kg AS INTEGER) as netto_jetty_kg,
  CAST(je.jetty_gross_kg - se.site_gross_kg AS INTEGER) as compare_gross_kg,
  CAST(mt.netto_diff_kg AS INTEGER) as deviasi_kg, je.jetty_dt
FROM matched_trips mt
JOIN site_entries se ON se.site_id = mt.site_id
JOIN jetty_entries je ON je.jetty_id = mt.jetty_id
ORDER BY se.site_date, se.site_ticket_no
" > backend/scripts/cleaned-data.json
```

Then commit and push — `import-from-sqlite.js` will pick up the new data on the next run.
