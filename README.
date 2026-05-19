# YUNO

> **Real strangers. Real conversations.**
> A modern, anonymous, random video chat platform — the spirit of Omegle, rebuilt for 2026: human-only, mobile-first, beautifully designed, and aggressively moderated.

YUNO is **not** an AI companion app. There are no bots, no synthetic personas, no fake engagement. Every connection is a real human being.

---

## What this repo is

A production-shaped monorepo for the entire YUNO platform:

```
yuno/
├── apps/
│   ├── web/          Next.js 14 (App Router) — landing, lobby, chat room, mod dashboard
│   ├── api/          Fastify REST API — auth, reports, bans, premium, TURN credentials
│   └── signaling/    Fastify + Socket.IO — matchmaking, queue, WebRTC signaling
├── packages/
│   ├── db/           Prisma schema + client (Postgres)
│   └── shared/       Shared TypeScript types, zod schemas, socket event contracts
├── infra/
│   ├── coturn/       TURN/STUN server config
│   ├── docker/       Per-service Dockerfiles
│   └── fly/          fly.toml deployment configs (signaling, api, web)
├── docs/             Strategy, architecture, API, websocket, WebRTC, security, deploy docs
└── docker-compose.dev.yml
```

---

## Quickstart (local dev)

**Prereqs:** Node 20+, pnpm 9+, Docker Desktop.

```bash
# 1. Install deps
pnpm install

# 2. Copy env
cp .env.example .env

# 3. Bring up Postgres + Redis (Coturn optional locally)
pnpm infra:up

# 4. Migrate the database
pnpm db:migrate

# 5. Run all three apps in parallel
pnpm dev
```

Then open:
- Web app: http://localhost:3000
- REST API: http://localhost:4000/healthz
- Signaling: ws://localhost:4001

> **WebRTC note:** localhost-to-localhost works without TURN. To test on real devices/networks, run Coturn (`docker compose --profile turn up coturn`) and update `TURN_HOST` in `.env`.

---

## Documentation

Read these in order:

| # | Doc | What it covers |
|---|---|---|
| 1 | [`docs/00-overview.md`](docs/00-overview.md) | Product philosophy, what we are and aren't |
| 2 | [`docs/01-strategy.md`](docs/01-strategy.md) | Market, positioning, defensibility |
| 3 | [`docs/02-business-model.md`](docs/02-business-model.md) | Free / Premium / Verified, unit economics |
| 4 | [`docs/03-monetization.md`](docs/03-monetization.md) | Pricing, ad strategy, payment flows |
| 5 | [`docs/04-viral-growth.md`](docs/04-viral-growth.md) | Acquisition, K-factor, retention loops |
| 6 | [`docs/05-mvp-roadmap.md`](docs/05-mvp-roadmap.md) | 90-day plan, milestones |
| 7 | [`docs/06-infrastructure-cost.md`](docs/06-infrastructure-cost.md) | Cost per CCU, scaling math |
| 8 | [`docs/07-architecture.md`](docs/07-architecture.md) | System architecture, data flow |
| 9 | [`docs/08-database-schema.md`](docs/08-database-schema.md) | Postgres schema, indexes, retention |
| 10 | [`docs/09-rest-api.md`](docs/09-rest-api.md) | REST endpoints, auth, request shapes |
| 11 | [`docs/10-websocket-events.md`](docs/10-websocket-events.md) | Socket.IO event contract |
| 12 | [`docs/11-webrtc-flow.md`](docs/11-webrtc-flow.md) | Signaling, ICE, SDP exchange |
| 13 | [`docs/12-security.md`](docs/12-security.md) | Threat model, anti-abuse, moderation pipeline |
| 14 | [`docs/13-deployment.md`](docs/13-deployment.md) | Production deploy on Fly.io + Cloudflare |
| 15 | [`docs/14-local-dev.md`](docs/14-local-dev.md) | Step-by-step local dev setup + troubleshooting |

---

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion, Zustand
- **Backend:** Node.js 20, Fastify, Socket.IO, Prisma
- **Realtime:** WebRTC (peer-to-peer with TURN fallback), Socket.IO over WebSocket
- **Storage:** PostgreSQL 16, Redis 7 (queue, presence, rate limiting)
- **Media relay:** Coturn (STUN + TURN over UDP/TCP/TLS)
- **Auth:** JWT (HS256), guest tokens by default, optional email upgrade
- **Payments:** Stripe (subscriptions for Premium + Verified)
- **Infra:** Fly.io for app services (multi-region), Cloudflare for CDN/DDoS, AWS S3 for moderation evidence
- **Observability:** Pino logs, Sentry, OpenTelemetry-ready

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Run web + api + signaling together |
| `pnpm dev:web` / `dev:api` / `dev:signaling` | Run a single app |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` / `pnpm lint` | Workspace-wide checks |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm infra:up` / `infra:down` | Local Postgres + Redis (+ optional Coturn) |

---

## License

Proprietary — all rights reserved. Contact for licensing.
