# Database Guide

## Architecture

- **Database**: PostgreSQL (`hauling_tracker` DB, `hauling_user` role)
- **Backend**: PM2 process `hauling-api` at `/var/www/hauling/backend`
- **Connection**: `DATABASE_URL=postgres://hauling_user:choose-a-strong-password@localhost:5432/hauling_tracker` in `/var/www/hauling/backend/.env`

> ClickHouse is **not used** by this app. It runs on the server for a separate project (`procurement_clickhouse`). Do not touch it.

---

## Applying Migrations

Migrations live in `supabase/migrations/`. They are plain SQL files numbered sequentially.

**To apply a new migration on the server:**

```bash
sudo -u postgres psql hauling_tracker -f /var/www/hauling/supabase/migrations/016_your_migration.sql
```

Or run the SQL directly:

```bash
sudo -u postgres psql hauling_tracker -c "ALTER TABLE trips ADD COLUMN ..."
```

**To check which migrations have been applied:**

```bash
sudo -u postgres psql hauling_tracker -c "SELECT filename FROM schema_migrations ORDER BY filename;"
```

**After running a migration, record it:**

```bash
sudo -u postgres psql hauling_tracker -c "INSERT INTO schema_migrations (filename) VALUES ('016_your_migration.sql') ON CONFLICT DO NOTHING;"
```

---

## Migration History

| # | File | What it does |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Initial trips table, enums, users |
| 002 | `002_add_pit_tare.sql` | Add tare at pit/site |
| 003 | `003_rename_pit_to_stockpile.sql` | Rename pit → stockpile |
| 004 | `004_rebuild_trips_schema.sql` | Full trips schema rebuild |
| 005 | `005_drop_tare_jetty.sql` | Remove old tare_jetty column |
| 006 | `006_barge_loadings.sql` | Add barge_loadings table |
| 007 | `007_analytics_role.sql` | Add analytics user role |
| 008 | `008_add_adjustment.sql` | Add adjustment field |
| 009 | `009_drop_unique_truck_per_day.sql` | Allow multiple trips per truck per day |
| 010 | `010_add_jetty_date.sql` | Add jetty/date indexing |
| 011 | `011_add_sessions.sql` | Add sessions table |
| 012 | `012_add_session_locks.sql` | Add session lock management |
| 013 | `013_add_tare_jetty.sql` | Add `tare_jetty_kg` to trips (jetty empty weight) |
| 014 | `014_add_coal_quality_premium_standard.sql` | Add 'premium'/'standard' to coal_quality_enum |
| 015 | `015_add_barge_stockpile_code.sql` | Add `stockpile_code` to barge_loadings |
| 016 | `016_add_new_roles.sql` | Add `site_jetty_operator` and `supervisor` user roles |
| 017 | `017_add_audit_log.sql` | Add `audit_log` table for change tracking |

---

## Key Tables

### `trips`
Core operational table. One row per truck weighing trip.

| Column | Type | Notes |
|--------|------|-------|
| `trip_id` | uuid | PK |
| `date` | date | Operational date |
| `no_tiket` | int | Ticket number (auto-increments per day) |
| `no_lambung` | text | Truck ID |
| `jetty_destination` | enum | `hasnur` or `talenta` |
| `coal_quality` | enum | `premium`, `standard`, `raw` (old), `clean` (old) |
| `tare_site_kg` | int | Empty weight at site (CP1) |
| `gross_site_kg` | int | Loaded weight at site (CP2) |
| `netto_site_kg` | int | Computed: gross_site - tare_site |
| `tare_jetty_kg` | int | Empty weight at jetty (optional, CP3) |
| `gross_jetty_kg` | int | Loaded weight at jetty (CP3) |
| `netto_jetty_kg` | int | Computed: gross_jetty - tare_jetty (or gross_jetty if no tare) |
| `deviasi_kg` | int | Computed: netto_jetty - netto_site |
| `status` | enum | `pending` → `loaded` → `completed` |
| `session_id` | uuid | FK → sessions |

### `barge_loadings`
Records coal loaded onto barges at the jetty.

| Column | Type | Notes |
|--------|------|-------|
| `loading_id` | uuid | PK |
| `jetty` | enum | `hasnur` or `talenta` |
| `barge_name` | text | |
| `tug_boat_name` | text | |
| `loading_date` | date | |
| `loading_qty_kg` | bigint | |
| `stockpile_code` | text | e.g. "Line 1", "Jetty R" |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | PK |
| `email` | text | Login username |
| `password_hash` | text | bcrypt |
| `role` | text | `admin`, `stockpile_operator`, `jetty_operator`, `analytics`, `site_jetty_operator`, `supervisor` |

### `sessions`
One session per operational day. Must be created by admin before operators can record trips.

---

## Common Fixes

**Backend won't start — port 3002 in use:**
```bash
# Find and kill what's on 3002
lsof -i :3002
# Or if it's the old Docker backend container:
docker stop hauling-backend-1 && docker rm hauling-backend-1
pm2 restart hauling-api
```

**Login fails with "hauling_user: Authentication failed":**
```bash
sudo -u postgres psql -c "ALTER USER hauling_user PASSWORD 'choose-a-strong-password';"
pm2 restart hauling-api
```

**PM2 backend crashes on startup:**
```bash
pm2 logs hauling-api --lines 20
# Check /var/www/hauling/backend/.env has correct DATABASE_URL (postgres://, not http://)
```
