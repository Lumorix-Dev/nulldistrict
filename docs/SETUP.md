# Setup

1. Install Node.js 20.11+ and npm 10+.
2. Install Rust stable and Tauri desktop prerequisites for Windows.
3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Copy and edit environment variables:

```bash
cp .env.example .env
```

5. Install dependencies and prepare the database:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

6. Run server and desktop dev surface:

```bash
npm run dev
```

7. Run native Tauri dev window:

```bash
npm run dev -w @nulldistrict/server
npm run tauri -w @nulldistrict/desktop -- dev
```

First flow to test:

- Register.
- Create a character.
- Press Play.
- Move with A/D or arrows.
- Jump with Space/W.
- Dash with Shift.
- Melee with J.
- Ability with K.
- Interact with E.
- Inventory with I.
- ESC opens the in-game menu.
