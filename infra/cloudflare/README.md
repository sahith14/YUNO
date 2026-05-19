# Cloudflare configuration notes (reference, not auto-applied)

> The TUI deployment guide is in [`docs/13-deployment.md`](../../docs/13-deployment.md). This file documents the specific Cloudflare rules to set up.

## DNS records

| Hostname | Type | Target | Proxied? |
|---|---|---|---|
| `yuno.app` | CNAME | `yuno-web.fly.dev` | ✅ |
| `www.yuno.app` | CNAME | `yuno.app` | ✅ |
| `api.yuno.app` | CNAME | `yuno-api.fly.dev` | ✅ |
| `ws.yuno.app` | CNAME | `yuno-signaling.fly.dev` | ❌ (DNS-only — Cloudflare's free WS proxy adds latency) |
| `us-east.turn.yuno.app` | CNAME | `yuno-coturn-iad.fly.dev` | ❌ |
| `eu-west.turn.yuno.app` | CNAME | `yuno-coturn-lhr.fly.dev` | ❌ |
| `ap-south.turn.yuno.app` | CNAME | `yuno-coturn-sin.fly.dev` | ❌ |

## Page rules

1. `*.yuno.app/*` → Always Use HTTPS, Browser Cache TTL: 1 hour
2. `yuno.app/_next/static/*` → Cache Level: Cache Everything, Edge Cache TTL: 1 month
3. `api.yuno.app/*` → Cache Level: Bypass

## WAF / firewall rules

- **Rate limit `/auth/guest`** — 10 requests / minute per IP
- **Block ASN 14618, 16509, 14061, 22773** (datacenter ASNs) on `/auth/*`
- **Block TOR exit nodes on `/chat`** (allow on marketing pages)
- **Bot Fight Mode**: ON
- **Turnstile widget** required on `/chat` (configure in code; enforce in WAF as challenge)

## Security headers (set via Transform Rules → Modify Response Header)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://api.yuno.app wss://ws.yuno.app https://*.stripe.com; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.stripe.com; style-src 'self' 'unsafe-inline'; frame-src https://challenges.cloudflare.com https://*.stripe.com;`

## Bandwidth / Spectrum (paid, optional, at scale)

If TURN over WS through Cloudflare proxying becomes interesting (DDoS protection on the signaling layer), upgrade to Cloudflare Spectrum. Until then, leave `ws.yuno.app` as DNS-only.
