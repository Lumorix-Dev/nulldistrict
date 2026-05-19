# Strato Live Status

Stand: 2026-05-19

## Server

- Anbieter: Strato VPS Linux
- Betriebssystem: Ubuntu 24.04 LTS
- IPv4: `217.160.79.250`
- Backend oeffentlich erreichbar unter: `http://217.160.79.250`
- Health Check: `http://217.160.79.250/api/health`
- Status Check: `http://217.160.79.250/api/status`

## Installiert

- Node.js 20
- npm
- PostgreSQL 16
- Nginx
- PM2
- Projektpfad: `/var/www/nulldistrict`

## Datenbank

- PostgreSQL laeuft lokal auf dem Linux-Server.
- Datenbank: `nulldistrict`
- Benutzer: `nulldistrict`
- Passwort steht nur in der Server-Datei `/var/www/nulldistrict/.env`.
- Prisma Migrationen wurden angewendet.
- Seed-Daten wurden eingespielt.

## Prozess

PM2 Prozess:

```bash
pm2 status
pm2 logs nulldistrict-server --lines 50
```

Restart:

```bash
cd /var/www/nulldistrict
pm2 restart nulldistrict-server --update-env
pm2 save
```

## Nginx

Nginx leitet Port 80 auf den Node-Server weiter:

```text
http://217.160.79.250 -> http://127.0.0.1:4000
```

Config:

```bash
/etc/nginx/sites-available/nulldistrict-api
```

Pruefen:

```bash
nginx -t
systemctl reload nginx
```

## Desktop App

Der lokale Windows-Build nutzt:

```env
VITE_SERVER_URL=http://217.160.79.250
```

Datei:

```text
apps/desktop/.env.production
```

Installer:

```text
apps/desktop/src-tauri/target/release/bundle/nsis/
```

## Heute Erledigt

- Ubuntu 24.04 auf Strato installiert.
- SSH-Key Login eingerichtet.
- PostgreSQL lokal auf dem Server installiert.
- Datenbank und DB-User erstellt.
- Projekt per ZIP auf den Server kopiert.
- `.env` auf dem Server angelegt.
- Prisma Migrationen ausgefuehrt.
- Seed-Daten eingespielt.
- Backend gebaut.
- Backend mit PM2 gestartet und fuer Neustarts gespeichert.
- Nginx Reverse Proxy eingerichtet.
- Firewall fuer SSH und Nginx geoeffnet.
- CORS fuer Tauri Desktop ergaenzt.
- JWT-Fehler beim Register/Login behoben.
- Oeffentliche Register- und Character-API erfolgreich getestet.
- Desktop-Client auf den Strato-Backend-URL gebaut.
- Refresh-Token-Erneuerung im Desktop-Client ergaenzt.
- Socket.IO Join haertet jetzt ab, dass nur eigene Charaktere genutzt werden.
- Pickups werden serverseitig gegen echte Map-Pickups und Naehe validiert.
- Live-Smoke-Test erfolgreich: Register, Refresh, Character, Socket Join, Chat, Combat, Loot, Quest und Shop.

## Naechste Sinnvolle Schritte

1. Eine Domain/Subdomain einrichten, z. B. `api.lumorix.de`.
2. HTTPS mit Certbot aktivieren.
3. GitHub Repository erstellen.
4. Server-Deployment auf GitHub/Pull-Update umstellen.
5. GitHub Releases fuer Windows Installer nutzen.
