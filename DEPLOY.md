# VPS Deployment Guide (Hostinger)

Assumes a fresh Ubuntu 22.04 VPS. Run all commands as root or a sudo user.

---

## 1. Connect to your VPS

```bash
ssh root@your-vps-ip
```

---

## 2. Install dependencies

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL 16
apt-get install -y postgresql postgresql-contrib

# Nginx + PM2
apt-get install -y nginx
npm install -g pm2
```

---

## 3. Set up PostgreSQL

```bash
# Start postgres
systemctl enable postgresql && systemctl start postgresql

# Create DB and user
sudo -u postgres psql <<EOF
create user hauling_user with password 'choose-a-strong-password';
create database hauling_tracker owner hauling_user;
\q
EOF

# Run the schema migration
sudo -u postgres psql -d hauling_tracker < /path/to/supabase/migrations/001_initial_schema.sql
```

### Create your first admin user

```bash
sudo -u postgres psql -d hauling_tracker
```

```sql
-- Inside psql — replace values as needed
insert into users (email, password_hash, role)
values (
  'admin@yourcompany.com',
  -- Generate hash: node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
  '$2a$12$REPLACE_WITH_REAL_HASH',
  'admin'
);
\q
```

To generate the bcrypt hash on your local machine:

```bash
cd backend && node -e "import('bcryptjs').then(m => m.default.hash('yourpassword', 12).then(console.log))"
```

---

## 4. Deploy the backend

```bash
# Clone or upload the project to the VPS
git clone https://github.com/yourrepo/Hauling_Tracker.git /var/www/hauling

cd /var/www/hauling/backend
npm install --omit=dev

# Create .env
cp .env.example .env
nano .env
```

Fill in `.env`:
```
PORT=3001
DATABASE_URL=postgres://hauling_user:choose-a-strong-password@localhost:5432/hauling_tracker
JWT_SECRET=generate-a-long-random-string-here
FRONTEND_URL=https://yourdomain.com
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start with PM2:
```bash
pm2 start src/index.js --name hauling-api
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

---

## 5. Build and deploy the frontend

Do this on your **local machine**, then upload the build:

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to your domain, e.g.:
echo "VITE_API_URL=https://yourdomain.com/api" > .env

npm install
npm run build
# Output is in frontend/dist/
```

Upload the build to the VPS:
```bash
scp -r dist/* root@your-vps-ip:/var/www/hauling/frontend/dist/
```

---

## 6. Configure Nginx

```bash
nano /etc/nginx/sites-available/hauling
```

Paste this config (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend — serve static files
    root /var/www/hauling/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API — proxy to Node.js
    location /api/ {
        proxy_pass         http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:
```bash
ln -s /etc/nginx/sites-available/hauling /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 7. HTTPS with Let's Encrypt (recommended)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot auto-renews. Done — your app is live over HTTPS.

---

## 8. Update `VITE_API_URL` in frontend `.env`

Once HTTPS is set up, rebuild the frontend with:
```
VITE_API_URL=https://yourdomain.com/api
```
and re-upload `dist/`.

---

## Useful PM2 commands

```bash
pm2 status            # check if API is running
pm2 logs hauling-api  # view live logs
pm2 restart hauling-api
```

## Useful PostgreSQL commands

```bash
sudo -u postgres psql -d hauling_tracker
\dt          # list tables
select * from users;
select count(*) from trips;
```

---

## Updating the app (subsequent deploys)

### 1. Pull latest code
```bash
cd /var/www/hauling && git pull origin main
```

### 2. Run any new migrations
```bash
sudo -u postgres psql -d hauling_tracker < supabase/migrations/008_add_adjustment.sql
# Run any new migration files added since last deploy
```

### 3. Fix DB permissions after migrations
```bash
sudo -u postgres psql -d hauling_tracker -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hauling_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hauling_user;"
```

### 4. Rebuild and redeploy frontend

**If using Docker (this server uses Docker on port 3003):**
```bash
cd /var/www/hauling && docker compose build frontend && docker compose up -d frontend
```

**If using nginx + static dist directly:**
```bash
cd /var/www/hauling/frontend && npm install && npm run build
```

### 5. Restart the API
```bash
pm2 restart hauling-api
```

### 6. If nginx isn't running
```bash
# Check what's blocking port 80/8080
ss -tlnp | grep :80

# If another site config in sites-enabled is grabbing a port Docker already uses, disable it:
rm /etc/nginx/sites-enabled/<conflicting-config>

# Then start nginx
systemctl start nginx && systemctl enable nginx
```

> **Note:** This server uses Docker to serve the frontend on port 3003 (not nginx directly).
> Always use `docker compose build frontend && docker compose up -d frontend` to update the frontend.
> Accessing the site via `ip:3003` bypasses nginx entirely — make sure you rebuild the Docker image, not just the `dist/` folder.

### Nginx config location on this server
- Config: `/etc/nginx/conf.d/hauling.conf`
- Frontend dist: `/var/www/hauling/frontend/dist/`
- API proxied from: `http://127.0.0.1:3002/`
