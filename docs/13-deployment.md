# YUNO — Production Deployment

## Stack at a glance

| Component | Where | Why |
|---|---|---|
| **Web** (Next.js) | Fly.io (multi-region) behind Cloudflare | Cloudflare CDN handles static + DDoS; Fly hot-runs SSR |
| **API** (Fastify) | Fly.io (multi-region) | Same — closest region to user |
| **Signaling** (Socket.IO) | Fly.io with sticky sessions | Stateful sockets need affinity; Fly's `app.toml` supports this |
| **Postgres** | Fly.io managed Postgres (HA) | Co-located with apps, zero-config replication |
| **Redis** | Upstash global, or Fly.io Redis | Low-latency from all app regions |
| **Coturn** | Fly.io machines (UDP-capable, dedicated VMs) in 5+ regions | Bandwidth optimization, see `06-infrastructure-cost.md` |
| **DNS** | Cloudflare | Geo-routing for Coturn, anycast everywhere else |
| **CDN / WAF** | Cloudflare | Static assets, image optimization, bot management |
| **Object storage** | AWS S3 (us-east-1) | Moderation evidence packs only |
| **Payments** | Stripe | Standard |
| **Identity verification** | Stripe Identity | Hosted, compliance-ready |
| **Logs / errors** | Sentry + Better Stack | Reasonable cost up to scale |
| **CI/CD** | GitHub Actions → Fly deploy | Standard |

## DNS layout

```
yuno.app                   ─→  Cloudflare → Fly web region nearest user
api.yuno.app               ─→  Cloudflare → Fly api region nearest user
ws.yuno.app                ─→  Cloudflare (proxied=false) → Fly signaling, sticky
turn.yuno.app              ─→  Cloudflare geo-DNS → nearest Coturn region:
                               us-east.turn.yuno.app
                               us-west.turn.yuno.app
                               eu-west.turn.yuno.app
                               sa-east.turn.yuno.app
                               ap-south.turn.yuno.app
```

WebSocket traffic to `ws.yuno.app` is **not Cloudflare-proxied** (Cloudflare's free-tier WS limits hurt latency); we point a CNAME directly at Fly. Cloudflare Pro+ would let us proxy, but Fly's edge already gives us TLS and DDoS at this layer.

## Per-service Fly configs

`infra/fly/web.toml`, `api.toml`, `signaling.toml`, and `coturn-{region}.toml` are committed in this repo.

### Web (`infra/fly/web.toml`)
- `auto_stop_machines = "stop"` for off-peak — Next.js is cheap to cold-start with edge caching
- 2x performance-1x in `iad`, `lhr`, `sin` minimum
- Health check: `/healthz` returns 200

### API (`infra/fly/api.toml`)
- 3x performance-1x in `iad`, `lhr`, `sin`
- Auto-scaler based on CPU
- Healthcheck: `/healthz` includes a Postgres query
- Mounts no volume — fully stateless

### Signaling (`infra/fly/signaling.toml`)
- 3x performance-2x in `iad`, `lhr`, `sin`
- **Sticky sessions** (Fly: `[[services]] concurrency.type = "connections"` + Socket.IO redis-adapter for cross-instance broadcast)
- No `auto_stop_machines` — always-warm
- Drain on SIGTERM with 30s grace

### Coturn (`infra/fly/coturn-iad.toml`, etc.)
- Dedicated VMs (not shared) — UDP needs predictable network
- `[[services]] internal_port = 3478, ports = [...]` for UDP/TCP/TLS
- Each region runs identical config; clients pick by latency

## Cloudflare config

- Cache rules: cache `/_next/static/*` aggressively, never cache `/api/*` or `/_next/data/*`
- WAF rules:
  - Rate limit `/auth/guest` to 10/min/IP
  - Block known datacenter ASNs from `/auth/*`
  - Block TOR exits from chat endpoints (allow on marketing pages)
- Bot management: Cloudflare Bot Fight Mode + Turnstile widget on lobby
- Page Rules: force HTTPS, set HSTS, set security headers
- Spectrum (paid) considered for raw TCP/UDP forwarding to Coturn at scale

## CI/CD pipeline

```
push to main
  → GitHub Actions
    → typecheck + lint + tests in parallel
    → build docker images for changed apps (path-aware)
    → push to Fly registry
    → fly deploy --strategy=canary for api + web
    → fly deploy --strategy=bluegreen for signaling (avoid mid-conversation drops)
    → smoke test (curl /healthz, /interests, mock /auth/guest)
    → notify Slack #deploys
```

PR builds spin up a Fly preview for the web app at `pr-<number>.preview.yuno.app`.

## Staging environment

A full mirror of prod runs in a single region (iad) at `staging.yuno.app`. Uses synthetic test data, Stripe test mode, Coturn in dev-region only. All major features are validated here before prod.

## Database migrations

```
1. Engineer runs `pnpm db:migrate` locally → produces migration SQL
2. PR CI runs migration against ephemeral Postgres in test
3. On merge to main:
   3a. Fly secrets dump current schema
   3b. Apply migration to staging Postgres
   3c. Apply migration to prod Postgres (apps still on N-1 schema)
   3d. Apps deploy with N schema — old + new can both run for 5 minutes
4. After all instances are on N, remove deprecated columns in N+1 release
```

We never apply destructive migrations and a deploy in the same step. Two-phase always.

## Secrets management

- Local: `.env` (gitignored)
- CI: GitHub Secrets
- Fly: `fly secrets set ...`
- Rotation: JWT secret, TURN secret, Stripe webhook secret rotated every 90 days
- All rotation events logged in `moderation_actions` (security audit trail)

## Observability

- **Logs:** Pino JSON logs → Fly logs → Better Stack
- **Errors:** Sentry (web, api, signaling all wired)
- **Metrics:**
  - Custom dashboard at `/admin/metrics` (live values)
  - Prometheus exporter on signaling and api (private ports)
  - Grafana cloud (free tier through scale phase)
- **Synthetic monitoring:** Better Stack pings `/healthz` from 5 regions every 60s

### Critical alerts
| Alert | Threshold | Wakes |
|---|---|---|
| `/healthz` failure | 2 consecutive failures | on-call engineer |
| Mod queue depth | > 200 pending | trust & safety lead |
| TTQC p50 | > 4 min | on-call engineer |
| TURN bandwidth | > 2x daily baseline | infra lead |
| Stripe webhook failures | any | finance + on-call |
| CSAM report not actioned | > 5 min | trust & safety lead + CEO |

## Cost ceilings (kill-switch alerts)

- Fly bandwidth > $300/day → email infra lead
- Fly bandwidth > $1000/day → page on-call, evaluate emergency rate-limit
- Stripe Identity volume > $200/day (anomaly) → page

## Backup & recovery

- Postgres: Fly automated daily snapshots, 30-day retention; weekly off-site backup to S3
- Redis: durability not critical (queue/presence is reconstructible) — daily RDB snapshot for safety
- S3 evidence bucket: versioning + Object Lock
- DR drill: quarterly, restore prod snapshot to staging, run smoke tests

## Launch readiness checklist

Before the public launch we verify:

- [ ] Sentry catching errors in prod
- [ ] Synthetic checks green from all regions
- [ ] Mod team trained, dashboard working
- [ ] PhotoDNA + NCMEC pipeline tested end-to-end with a synthetic case
- [ ] Stripe checkout + webhook tested in test mode and live mode
- [ ] Stripe Identity verified end-to-end with a real test ID
- [ ] Privacy policy + ToS posted, age gate live
- [ ] Coturn fleet healthy in 3+ regions, < 200ms latency from target geos
- [ ] DNS cached and propagated globally
- [ ] Cloudflare WAF rules tested
- [ ] First 5k users invited from waitlist, working through email queue
- [ ] On-call rotation scheduled, runbooks linked
- [ ] Rollback plan documented and tested
- [ ] Incident response drill completed
