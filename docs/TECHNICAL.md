# Hauling Tracker — Technical Documentation

## Overview

Hauling Tracker is a web application for recording and monitoring coal truck weighing operations across three checkpoints: stockpile entry (CP1), stockpile exit (CP2), and jetty arrival (CP3). It tracks weight deviation between site and jetty, manages daily operational sessions, and exports data for reporting.

---

## Architecture

```
Browser (React SPA / PWA)
        │  HTTPS
        ▼
   Nginx (80 / 443)
   ├── /         → Docker: frontend static files (port 3003)
   └── /api/*    → PM2: Node.js backend (port 3001 / 3002)
                         │
                         ▼
                   PostgreSQL 16
                  (localhost:5432)
```

**Timezone**: All operational dates and timestamps use WITA (UTC+8). The backend sets `TimeZone = 'Asia/Makassar'` on each DB connection.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, Tailwind CSS 3.4 |
| PWA | vite-plugin-pwa (offline-capable) |
| Backend | Node.js 20 LTS, Express 4.19 (ESM modules) |
| Process manager | PM2 |
| Database | PostgreSQL 16 |
| Auth | JWT (12-hour expiry) + bcryptjs (12-round salt) |
| Excel export | ExcelJS (bilingual: Indonesian / Chinese headers) |
| Container | Docker (frontend only) |
| Reverse proxy | Nginx |

---

## Repository Structure

```
Hauling_Tracker/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  Route definitions + RoleRoute guard
│   │   ├── contexts/                AuthProvider, LangProvider, UnitProvider
│   │   ├── pages/                   One file per route/screen
│   │   │   ├── LoginPage.jsx
│   │   │   ├── StockpileOperatorPage.jsx
│   │   │   ├── JettyOperatorPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── SessionManagementPage.jsx
│   │   │   └── ChangelogPage.jsx
│   │   └── components/              Shared UI components
│   ├── Dockerfile
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── index.js                 Express app entry, middleware wiring
│   │   ├── db.js                    pg pool + timezone config
│   │   ├── middleware/
│   │   │   ├── requireAuth.js       JWT verification
│   │   │   └── requireRole.js       Role-based access check
│   │   └── routes/
│   │       ├── auth.js              /auth/*
│   │       ├── trips.js             /trips/*
│   │       ├── sessions.js          /sessions/*
│   │       ├── bargeLoadings.js     /barge-loadings/*
│   │       └── analytics.js         /analytics/*
│   ├── scripts/
│   │   ├── upsert-user.js           CLI: create/update users
│   │   └── import-historical.js     CLI: bulk import historical data
│   └── .env.example
│
├── supabase/migrations/             Sequential SQL migration files
├── docs/                            This documentation
├── docker-compose.yml
├── DATABASE.md                      DB ops runbook
└── DEPLOY.md                        Server setup guide
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Example | Required |
|----------|---------|----------|
| `PORT` | `3001` | Yes |
| `DATABASE_URL` | `postgres://hauling_user:pass@localhost:5432/hauling_tracker` | Yes |
| `JWT_SECRET` | random 64-char string | Yes |
| `FRONTEND_URL` | `https://yourdomain.com` | Yes (CORS) |

### Frontend (`frontend/.env`)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://yourdomain.com` | Yes |

---

## Local Development Setup

### 1. Database

```bash
createdb hauling_tracker
for f in supabase/migrations/*.sql; do psql hauling_tracker < "$f"; done
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL + JWT_SECRET
npm install
npm run dev                  # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env         # set VITE_API_URL=http://localhost:3001
npm install
npm run dev                  # http://localhost:5173
```

### 4. First admin user

```bash
cd backend
npm run user:upsert -- admin@example.com yourpassword admin
```

---

## User Roles & Permissions

| Role | CP1 | CP2 | CP3 | Edit trips | Delete trips | Barge loading | Sessions | Admin panel | Analytics | Audit log |
|------|-----|-----|-----|-----------|-------------|--------------|----------|------------|-----------|----------|
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `supervisor` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |
| `stockpile_operator` | ✓ | ✓ | — | — | — | — | — | — | — | — |
| `jetty_operator` | — | — | ✓ | — | — | ✓ | — | — | — | — |
| `site_jetty_operator` | ✓ | ✓ | ✓ | — | — | ✓ | — | — | ✓ | — |
| `analytics` | — | — | — | — | — | — | — | — | ✓ | — |

**Adding a new role**: Update the enum in a new migration SQL, add it to `App.jsx` route guards, and add it to `LoginPage.jsx`'s `ROLE_HOME` map. Rebuild the Docker frontend image after the change.

---

## API Reference

All endpoints (except `/auth/login` and `/health`) require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Authenticate; returns JWT |
| GET | `/auth/users` | admin | List all users |
| POST | `/auth/users` | admin | Create user |
| PATCH | `/auth/users/:id` | admin | Update role or password |
| DELETE | `/auth/users/:id` | admin | Delete user |

### Trips

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/trips` | stockpile_operator, supervisor, admin | CP1: record truck arrival + tare weight |
| PATCH | `/trips/:id/cp2` | stockpile_operator, supervisor, admin | CP2: record gross weight + departure |
| PATCH | `/trips/:id/cp3` | jetty_operator, supervisor, admin | CP3: record jetty gross weight |
| GET | `/trips/today` | all (role-filtered) | All trips for today's session |
| GET | `/trips/search?no_lambung=` | all | Find a specific truck's trip today |
| GET | `/trips/incoming` | jetty_operator, supervisor, admin | Trips with status `in_transit` |
| GET | `/trips/export` | supervisor, admin, analytics | Excel export, filtered by date + jetty |
| GET | `/trips/truck-history` | supervisor, admin, analytics | All-time trips for a truck |
| GET | `/trips/truck-history/export` | supervisor, admin, analytics | Excel export of truck history |
| PATCH | `/trips/:id` | supervisor, admin | Edit arbitrary trip fields |
| PATCH | `/trips/:id/lock` | admin | Toggle individual trip lock |
| DELETE | `/trips/:id` | supervisor, admin | Delete a trip |

### Sessions

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/sessions` | admin | List all sessions |
| GET | `/sessions/today` | all | Today's session info |
| PATCH | `/sessions/:id/end-jetty` | admin | End a single jetty's portion of the session |
| PATCH | `/sessions/:id/end` | admin | End the full session |
| PATCH | `/sessions/:id/lock-site` | admin | Toggle site data lock |
| PATCH | `/sessions/:id/lock-jetty` | admin | Toggle jetty data lock |

### Barge Loadings

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/barge-loadings` | all with analytics/supervisor | List loadings (filter by jetty, date) |
| POST | `/barge-loadings` | jetty_operator, supervisor, admin | Record a barge loading |
| DELETE | `/barge-loadings/:id` | admin | Delete a barge loading record |

### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/overview` | Aggregate trip counts, tonnage by jetty and date |
| GET | `/analytics/jetty-balance?jetty=` | Remaining coal at a jetty: total netto jetty arrived minus total barge loaded |
| GET | `/analytics/monitoring` | Weight deviation monitoring, breach detection |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ ok: true }` — used by uptime monitors |

---

## Database Schema

See [DATABASE.md](../DATABASE.md) for the full migration history and table schemas.

### Core tables

**`trips`** — one row per truck weighing journey

| Column | Type | Notes |
|--------|------|-------|
| `trip_id` | uuid PK | |
| `date` | date | Operational date (WITA) |
| `no_tiket` | int | Auto-increments per day |
| `no_lambung` | text | Truck ID (e.g. "AK-123") |
| `jetty_destination` | enum | `hasnur` \| `talenta` |
| `coal_quality` | enum | `premium` \| `standard` \| `raw` \| `clean` |
| `status` | enum | `pending` → `in_transit` → `completed` |
| `tare_site_kg` | int | CP1 — empty weight at stockpile |
| `gross_site_kg` | int | CP2 — loaded weight at stockpile |
| `netto_site_kg` | int | Computed: gross_site − tare_site |
| `tare_jetty_kg` | int | CP3 — empty weight at jetty (optional) |
| `gross_jetty_kg` | int | CP3 — loaded weight at jetty |
| `netto_jetty_kg` | int | Computed: gross_jetty − tare_jetty (or gross_jetty) |
| `deviasi_kg` | int | Computed: netto_jetty − netto_site |
| `compare_gross_kg` | int | Computed: gross_jetty − gross_site |
| `cp1_timestamp` | timestamptz | |
| `cp2_timestamp` | timestamptz | |
| `cp3_timestamp` | timestamptz | |
| `session_id` | uuid FK | → sessions |
| `is_locked` | boolean | Prevents edits when true |
| `adjustment_kg` | int | Manual admin adjustment |
| `cuaca_mmi` | text | Weather note at site |
| `stockpile_code` | text | Source stockpile (e.g. "Line 1") |

**`sessions`** — one per operational day

| Column | Type | Notes |
|--------|------|-------|
| `session_id` | uuid PK | |
| `session_date` | date | |
| `status` | enum | `active` \| `ended` |
| `site_locked` | boolean | Blocks CP1/CP2 edits |
| `jetty_locked` | boolean | Blocks CP3 edits |
| `hasnur_ended_at` | timestamptz | Partial session close |
| `talenta_ended_at` | timestamptz | Partial session close |
| `ended_at` | timestamptz | Full session close |

**`barge_loadings`** — coal loaded onto barges

| Column | Type | Notes |
|--------|------|-------|
| `loading_id` | uuid PK | |
| `jetty` | enum | `hasnur` \| `talenta` |
| `barge_name` | text | |
| `tug_boat_name` | text | |
| `loading_date` | date | |
| `loading_qty_kg` | bigint | |
| `stockpile_code` | text | |

**`audit_log`** — immutable change history

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `user_email` | text | Denormalized for readability |
| `action` | text | e.g. `cp1_entry`, `edit_trip`, `delete_trip` |
| `record_id` | text | The affected trip_id |
| `old_data` | jsonb | State before change |
| `new_data` | jsonb | State after change |
| `created_at` | timestamptz | Indexed DESC |

---

## Trip Status Flow

```
POST /trips         → status: pending    (CP1 complete — truck at site, tare recorded)
PATCH /trips/:id/cp2 → status: in_transit (CP2 complete — truck departed, gross recorded)
PATCH /trips/:id/cp3 → status: completed  (CP3 complete — truck at jetty, deviation calculated)
```

Computed fields (`netto_site_kg`, `netto_jetty_kg`, `deviasi_kg`, `compare_gross_kg`) are calculated server-side on each relevant PATCH.

---

## Session Lifecycle

1. Admin creates a session (auto-created on first trip of the day if none exists).
2. Operators record CP1 → CP2 → CP3 throughout the day.
3. Admin can lock the site portion (`site_locked`) to prevent further CP1/CP2 changes.
4. Admin can lock the jetty portion (`jetty_locked`) to prevent further CP3 changes.
5. Admin ends individual jetty sessions (`hasnur_ended_at` / `talenta_ended_at`) or the full session.
6. Once ended, the session is read-only.

---

## Frontend State Management

- **AuthContext** — JWT token + decoded user (role, email); persisted in `localStorage`
- **LangContext** — language toggle (Indonesian / Chinese); persisted in `localStorage`
- **UnitContext** — weight unit display preference (kg / ton)
- **RoleRoute** — HOC that checks the current user's role against an allowed-roles list; redirects to `/login` if unauthorized

---

## Adding a New Migration

```bash
# 1. Create the SQL file
touch supabase/migrations/019_your_change.sql

# 2. Apply locally
psql hauling_tracker < supabase/migrations/019_your_change.sql

# 3. Apply on production server
sudo -u postgres psql hauling_tracker -f /var/www/hauling/supabase/migrations/019_your_change.sql
sudo -u postgres psql hauling_tracker -c \
  "INSERT INTO schema_migrations (filename) VALUES ('019_your_change.sql') ON CONFLICT DO NOTHING;"
```

---

## Deployment

See [DEPLOY.md](../DEPLOY.md) for the full server setup guide.

**Quick deploy after code changes:**

```bash
# On the production server
cd /var/www/hauling
git pull

# If frontend changed:
docker compose build frontend && docker compose up -d frontend

# Backend always:
pm2 restart hauling-api
```

**PM2 diagnostics:**

```bash
pm2 status
pm2 logs hauling-api --lines 50
```

---

## Known Constraints

- **No test suite** — all validation is manual or through integration testing against a live DB.
- **ClickHouse is installed on the server but is not used by this app** — it belongs to a separate project (`procurement_clickhouse`). Do not touch it.
- **Session must exist** before operators can record trips for a given date. If operators report they can't submit, check that today's session was created.
- **Frontend role map** — `LoginPage.jsx` has a local `ROLE_HOME` map that must stay in sync with the roles in `App.jsx`. Any new role added to the backend enum needs to be reflected in both files.
