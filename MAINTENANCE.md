# Maintenance Break Runbook

Use this guide whenever you need to deploy updates, run database migrations, or perform any operation that requires restarting the backend or rebuilding the frontend.

---

## Overview

The app has three components that may need to restart during maintenance:

| Component | How it runs | Restart command |
|-----------|------------|-----------------|
| Backend API | PM2 (`hauling-api`) | `pm2 restart hauling-api` |
| Frontend | Docker on port 3003 | `docker compose build frontend && docker compose up -d frontend` |
| Nginx (reverse proxy) | systemd | `systemctl reload nginx` |

Restarting any of these causes a brief gap where users see connection errors. The steps below give users a clean **"Under Maintenance"** page instead.

---

## Part 1 — One-time Setup (do this before you need it)

These changes only need to be done once. After that, enabling/disabling maintenance is a single command.

### 1a. Backend maintenance mode

Add this block to `backend/src/index.js` **before** any `app.use(...)` route registrations:

```js
if (process.env.MAINTENANCE_MODE === 'true') {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    res.status(503).json({
      maintenance: true,
      message: 'App is under scheduled maintenance. We will be back shortly.',
    });
  });
}
```

Deploy this change once. After that, you toggle maintenance mode via `.env` without touching code.

### 1b. Nginx maintenance page

On the **VPS**, create a static maintenance page:

```bash
cat > /var/www/hauling/maintenance.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — Hauling Tracker</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .box { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; }
    p { color: #64748b; line-height: 1.6; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">🔧</div>
    <h1>Under Maintenance</h1>
    <p>Hauling Tracker is undergoing scheduled maintenance and will be back shortly. Please try again in a few minutes.</p>
  </div>
</body>
</html>
EOF
```

Then add the following block inside the `server {}` block of `/etc/nginx/conf.d/hauling.conf`, **before** the `location /` block:

```nginx
# Maintenance mode — toggle by creating/removing /var/www/hauling/maintenance.flag
if (-f /var/www/hauling/maintenance.flag) {
    return 503;
}
error_page 503 /maintenance.html;
location = /maintenance.html {
    root /var/www/hauling;
    internal;
}
```

Reload Nginx to apply:

```bash
nginx -t && systemctl reload nginx
```

---

## Part 2 — Maintenance Window Procedure

### Step 1 — Preparation (30 min before)

1. Check there are no trucks currently in transit:
   ```bash
   sudo -u postgres psql -d hauling_tracker -c "SELECT count(*) FROM trips WHERE status = 'in_transit';"
   ```
   If there are active trips, wait until they are completed or coordinate with the jetty operator.

2. Have an admin **lock the current session** from the app UI. This prevents new trips from being created while you work.

3. Notify drivers and operators (WhatsApp/radio) that the app will be down for ~10-15 minutes.

---

### Step 2 — Enable Maintenance Mode

Run these commands on the VPS:

```bash
# Show maintenance page on frontend (immediate)
touch /var/www/hauling/maintenance.flag
nginx -t && systemctl reload nginx

# Enable maintenance mode on backend API
sed -i '/^MAINTENANCE_MODE/d' /var/www/hauling/backend/.env   # remove old value if present
echo "MAINTENANCE_MODE=true" >> /var/www/hauling/backend/.env
pm2 restart hauling-api
```

**Verify it's on:** open the site in your browser — you should see the maintenance page.

---

### Step 3 — Perform Maintenance

```bash
# Always back up the database first
mkdir -p /var/backups/hauling
sudo -u postgres pg_dump hauling_tracker > /var/backups/hauling/hauling_$(date +%Y%m%d_%H%M).sql
echo "Backup complete: $(ls -lh /var/backups/hauling/ | tail -1)"

# Pull latest code
cd /var/www/hauling
git pull origin main

# Run new migrations (if any new .sql files were added)
cd backend
npm run migrate

# Fix permissions after migrations (always safe to run)
sudo -u postgres psql -d hauling_tracker -c \
  "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hauling_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hauling_user;"

# Rebuild and restart frontend (always do this for frontend changes)
cd /var/www/hauling
docker compose build frontend && docker compose up -d frontend

# Restart backend (if backend code changed)
pm2 restart hauling-api
```

---

### Step 4 — Verify Before Going Live

```bash
# Backend health check
curl http://localhost:3002/health
# Expected: {"ok":true}

# PM2 status
pm2 status
# Expected: hauling-api → online

# Docker status
docker compose ps
# Expected: frontend → Up
```

Log in via a browser (while maintenance mode is still on, the API will block non-health requests — log in via `localhost:3002` directly or check logs):

```bash
pm2 logs hauling-api --lines 20
```

No crash stack traces = good to go.

---

### Step 5 — Disable Maintenance Mode

```bash
# Remove MAINTENANCE_MODE from backend .env
sed -i '/^MAINTENANCE_MODE/d' /var/www/hauling/backend/.env
pm2 restart hauling-api

# Remove maintenance flag (frontend goes live immediately)
rm /var/www/hauling/maintenance.flag
nginx -t && systemctl reload nginx
```

**Verify it's off:** refresh the site — you should see the login page, not the maintenance page.

---

### Step 6 — Post-Maintenance Checks

- [ ] Site loads and login works
- [ ] Admin can view sessions and the trip list
- [ ] No unexpected errors in `pm2 logs hauling-api`
- [ ] `curl https://yourdomain.com/api/health` returns `{"ok":true}`
- [ ] Notify operators that the app is back online

---

## Rollback

If something goes wrong **after** disabling maintenance mode:

```bash
# 1. Re-enable maintenance mode immediately
touch /var/www/hauling/maintenance.flag && systemctl reload nginx
echo "MAINTENANCE_MODE=true" >> /var/www/hauling/backend/.env && pm2 restart hauling-api

# 2. Restore the database from backup
sudo -u postgres psql hauling_tracker < /var/backups/hauling/hauling_YYYYMMDD_HHMM.sql

# 3. Revert code to previous working commit
cd /var/www/hauling
git log --oneline -5   # find the last good commit hash
git checkout <commit-hash>

# 4. Rebuild and restart
docker compose build frontend && docker compose up -d frontend
pm2 restart hauling-api

# 5. Verify, then disable maintenance mode (Step 5 above)
```

---

## Estimated Downtime

| Operation | Typical Duration |
|-----------|-----------------|
| Enable maintenance mode | < 1 min |
| DB backup (small DB) | 1-2 min |
| `git pull` | < 1 min |
| Run migrations | 1-2 min |
| Rebuild frontend Docker | 3-5 min |
| PM2 restart | < 30 sec |
| Disable maintenance mode | < 1 min |
| **Total user-facing downtime** | **~10-15 min** |

The user-facing downtime is the entire window from Step 2 to Step 5 — users see the maintenance page the whole time. The actual service interruption is intentional and controlled, not a crash.
