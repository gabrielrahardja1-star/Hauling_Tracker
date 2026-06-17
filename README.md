# Hauling Tracker

Coal hauling clock-in/clock-out system for tracking truck trips from a mine stockpile to jettys (Hasnur / Talenta).

## Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, PWA (vite-plugin-pwa)
- **Backend**: Node.js + Express (ESM), PM2
- **Database**: PostgreSQL (self-hosted)
- **Auth**: Custom JWT + bcryptjs
- **Excel export**: ExcelJS

---

## Project Structure

```
Hauling_Tracker/
├── frontend/          React PWA
├── backend/           Node.js Express API
├── supabase/
│   └── migrations/    PostgreSQL schema SQL
└── docs/
    └── user-access-guide.md  Team username/role reference
```

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access — user management, session locking, all data |
| `stockpile_operator` | Site page — CP1 (tare) and CP2 (gross) entry |
| `jetty_operator` | Jetty page — CP3 entry, barge loading |
| `site_jetty_operator` | Both site and jetty pages (view/entry, no edit) |
| `supervisor` | Both pages + edit/delete trips + audit changelog |
| `analytics` | Analytics & reports only |

---

## App Routes

| Path | Roles | Screen |
|------|-------|--------|
| `/login` | All | Sign-in page |
| `/stockpile` | stockpile_operator, site_jetty_operator, supervisor, admin | Site CP1/CP2 entry |
| `/jetty` | jetty_operator, site_jetty_operator, supervisor, admin | Jetty CP3 entry + barge loading |
| `/admin` | admin | User management, session control, data table |
| `/analytics` | analytics, admin, supervisor, site_jetty_operator | Reports & truck history |
| `/changelog` | admin, supervisor | Audit log of all changes |
| `/sessions` | admin | Session management |

---

## Quick Start (local dev)

### 1. PostgreSQL

Create a local DB and run all migrations in order:

```bash
createdb hauling_tracker
for f in supabase/migrations/*.sql; do psql hauling_tracker < "$f"; done
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev            # http://localhost:3002
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:3002
npm install
npm run dev            # http://localhost:5173
```

### 4. Create first admin user

```bash
cd backend
npm run user:upsert -- admin@example.com yourpassword admin
```

The admin can then manage all other user accounts from `/admin` inside the app.

---

## VPS Deployment

See [DEPLOY.md](DEPLOY.md) for full server setup.

> **Production server**: Docker serves the frontend on port 3003. Always rebuild the Docker image after frontend changes:
> ```bash
> cd /var/www/hauling && git pull && docker compose build frontend && docker compose up -d frontend && pm2 restart hauling-api
> ```

See [docs/user-access-guide.md](docs/user-access-guide.md) for the full team username/role mapping.
