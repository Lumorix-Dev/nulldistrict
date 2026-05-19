# Strato Deployment

This guide assumes a Linux Strato server.

## Install Node.js

Install Node.js 20+ with your preferred Strato-compatible method, for example NodeSource or `nvm`.

```bash
node --version
npm --version
```

## PostgreSQL

Use the existing Strato PostgreSQL product or install PostgreSQL on the server. Set:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
```

## Environment

Create `.env` on the server:

```bash
JWT_SECRET="long-random-production-secret"
SERVER_PORT=4000
CLIENT_ORIGIN="https://your-game-domain.example"
SHOP_ENABLED=true
PREMIUM_PURCHASES_ENABLED=false
RELEASE_CHANNEL=beta
```

Never commit production secrets.

## Build And Migrate

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build:shared
npm run build:server
```

## Run With pm2

```bash
npm install -g pm2
pm2 start apps/server/dist/index.js --name nulldistrict-server
pm2 save
pm2 startup
```

## Or Run With systemd

Create `/etc/systemd/system/nulldistrict.service` pointing to:

```bash
/usr/bin/node /var/www/nulldistrict/apps/server/dist/index.js
```

Then:

```bash
sudo systemctl enable nulldistrict
sudo systemctl start nulldistrict
sudo journalctl -u nulldistrict -f
```

## Reverse Proxy

Use nginx for HTTPS:

```nginx
server {
  server_name api.nulldistrict.example;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Use Let's Encrypt or Strato HTTPS tooling. Open only required ports: 80/443 publicly, database privately if possible.

## Health Check

```bash
curl https://api.nulldistrict.example/api/health
curl https://api.nulldistrict.example/api/status
```

## Update Process

Pull the latest code, install dependencies if needed, run migrations, build, restart pm2/systemd, and check logs.
