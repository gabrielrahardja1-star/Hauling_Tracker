# Hauling Tracker

Coal hauling clock-in/clock-out system for tracking truck trips from a mine pit to jettys (Hasnur / Talenta).

## Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, PWA (vite-plugin-pwa)
- **Backend**: Node.js + Express (ESM)
- **Database**: PostgreSQL (self-hosted)
- **Auth**: Custom JWT + bcryptjs
- **Excel export**: ExcelJS

---

## Project Structure

```
Hauling_Tracker/
├── frontend/          React PWA
├── backend/           Node.js Express API
└── supabase/
    └── migrations/    PostgreSQL schema SQL
```

---

## Quick Start (local dev)

### 1. PostgreSQL

Create a local DB and run the schema:

```bash
createdb hauling_tracker
psql hauling_tracker < supabase/migrations/001_initial_schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev            # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:3001
npm install
npm run dev            # http://localhost:5173
```

### 4. Create first admin user

```bash
cd backend
node -e "
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('yourpassword', 12);
console.log(hash);
" --input-type=module
```

Then insert into the DB:
```sql
insert into users (email, password_hash, role)
values ('admin@example.com', '<paste hash>', 'admin');
```

After that, the admin can create operator accounts from the Users panel inside the app.

---

## API Endpoints

| Method   | Path                            | Role                      | Description               |
|----------|---------------------------------|---------------------------|---------------------------|
| `POST`   | `/auth/login`                   | All                       | Sign in, returns JWT      |
| `POST`   | `/auth/users`                   | admin                     | Create user account       |
| `GET`    | `/auth/users`                   | admin                     | List all users            |
| `PATCH`  | `/auth/users/:id`               | admin                     | Update role or password   |
| `DELETE` | `/auth/users/:id`               | admin                     | Delete user               |
| `POST`   | `/trips`                        | pit_operator, admin       | Create a new trip         |
| `GET`    | `/trips/active?truck_id=`       | jetty_operator, admin     | Get today's active trip   |
| `PATCH`  | `/trips/:id`                    | jetty_operator, admin     | Complete trip or admin edit |
| `GET`    | `/trips?date=&jetty=&status=`   | admin                     | List trips with filters   |
| `GET`    | `/trips/export?date=&jetty=`    | admin                     | Download .xlsx report     |

---

## App Routes

| Path     | Role                      | Screen                                   |
|----------|---------------------------|------------------------------------------|
| `/login` | All                       | Sign-in page                             |
| `/pit`   | pit_operator, admin       | Create new trip (clock in)               |
| `/jetty` | jetty_operator, admin     | Complete trip (clock out)                |
| `/admin` | admin                     | Table view, inline edit, export, user mgmt |

---

## VPS Deployment

See [DEPLOY.md](DEPLOY.md) for full Hostinger VPS setup (PostgreSQL + PM2 + Nginx + HTTPS).
