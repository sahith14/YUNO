# Local dev — quickstart

**Prereqs**
- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (for Postgres + Redis)

**1. Install dependencies**
```bash
pnpm install
```

**2. Copy env**
```bash
cp .env.example .env
```
Open `.env` and set at minimum:
- `JWT_SECRET` — any long random string for dev
- `INTERNAL_SECRET` — any string for dev
- `TURN_SHARED_SECRET` — any string for dev (must match `infra/coturn/turnserver.conf`)

**3. Bring up Postgres + Redis**
```bash
pnpm infra:up
```

**4. Generate Prisma client + run migrations**
```bash
pnpm db:generate
pnpm db:migrate
```
The first run will prompt you for a migration name (use `init`).

**5. Seed the interests dictionary**
```bash
pnpm --filter @yuno/db run seed
```

**6. Run the three apps in parallel**
```bash
pnpm dev
```

Open:
- **Web:** http://localhost:3000
- **API health:** http://localhost:4000/healthz
- **Signaling health:** http://localhost:4001/healthz

**Two-window test (the magic moment)**
1. Open `localhost:3000/chat` in window A
2. Open `localhost:3000/chat` in **incognito** window B (fresh guest identity)
3. Both grant camera/mic and tap "Find someone now"
4. They should match in < 3 seconds and you'll see yourself in both windows

**Run a single service**
```bash
pnpm dev:web
pnpm dev:api
pnpm dev:signaling
```

**Open Prisma Studio**
```bash
pnpm db:studio
```

**Bring everything down**
```bash
pnpm infra:down
```

---

## Common issues

**`getUserMedia` fails** — Use Chrome or Edge. Safari requires HTTPS even on localhost; for Safari use `https://localhost:3000` with a self-signed cert, or just use Chrome for dev.

**Match doesn't happen** — Both clients must grant camera permissions and pass the consent checkbox. Open browser devtools → Network → WS to confirm both sockets are connected.

**ICE never connects** — On the same machine in dev this should always work via host candidates. Cross-network testing requires Coturn:
```bash
docker compose --profile turn up coturn
```
Then update `TURN_HOST` in `.env` to `localhost` (or your machine's LAN IP if testing across devices).

**Stripe webhooks** — In dev use the Stripe CLI:
```bash
stripe listen --forward-to localhost:4000/billing/webhook
```

**Make yourself an admin** — After registering an email account, in psql:
```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```
Then log in again to get a fresh JWT with `kind = "admin"`. The `/admin/*` routes will now be accessible.
