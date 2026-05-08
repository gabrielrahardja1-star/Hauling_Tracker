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
