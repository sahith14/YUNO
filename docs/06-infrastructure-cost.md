# YUNO — Infrastructure Cost Breakdown

## TL;DR

| Stage | DAU | Concurrent peak | Monthly infra cost | Cost / DAU / day |
|---|---|---|---|---|
| Alpha | 1k | 100 | $200 | $0.0067 |
| Beta | 25k | 2.5k | $1,800 | $0.0024 |
| Growth | 100k | 10k | $5,500 | $0.0018 |
| Scale | 500k | 50k | $19,000 | $0.0013 |
| Mass | 2M | 200k | $58,000 | $0.0010 |

The dominant cost at every stage is **TURN bandwidth**. Everything else (compute, db, redis, storage) is rounding error compared to relayed media.

---

## 1. Where the money goes

### Bandwidth (TURN relay) — 60-70% of total cost
- **P2P direct:** when both users have NAT-traversable public IPs, traffic is free to us
- **STUN-only routing:** when one or both are behind a permissive NAT, traffic is free to us
- **TURN-relayed:** when symmetric NAT or restricted firewall blocks P2P, we relay via Coturn — **this is where we pay**
- **Industry-typical TURN ratio:** 15-25% of sessions
- **Bandwidth per relayed session:** ~1.5 Mbps × 2 directions × N seconds. At median 4 min sessions = ~90 MB / relayed session

At 100k DAU, ~3 sessions / DAU / day, 20% TURN ratio:
```
100,000 × 3 × 0.20 × 90 MB = 5.4 TB/day = 162 TB/month
```

At Fly.io egress pricing ($0.02/GB after free tier): **~$3,250/month for TURN bandwidth alone.**

### Compute — 10-15% of total cost
Three Node services (api, signaling, web) — each comfortably handles 5-10k CCU per 2-vCPU instance. Need ~3 instances per service at scale, plus signaling needs to scale linearly with concurrent users.

### Postgres — 5-8% of total cost
Most data is ephemeral (sessions, queue state in Redis). Postgres only stores users, reports, bans, premium subscriptions, audit logs. A managed 4-vCPU Postgres on Fly.io ($120/mo) handles ~5M users.

### Redis — 5-8% of total cost
Hot path: queue state, presence, rate limits. Sized for active sessions, not historical. ~1GB memory per 10k CCU. Fly.io Redis or Upstash $30-200/mo.

### Moderation — 8-12% of total cost
- Frame sampling: client uploads 1 thumbnail every 15s during a session
- ~16 frames per 4-minute session × 3 sessions / DAU / day = 48 classifier calls / DAU / day
- Classifier cost: $0.001 per call (Hive Moderation, AWS Rekognition, or self-hosted CLIP)
- At 100k DAU: 4.8M calls/day × $0.001 = **$4,800/day** if we used a paid API at scale → **we self-host past beta**

### Storage (S3) — 1-2%
Only stores: moderation evidence packs (videos saved when a report is filed, retained 30 days), Stripe Identity is stored by Stripe.

### Logs / observability — 1-2%
Sentry + Pino logs to Fly.io's log shipping. Roughly $200/mo flat at 100k DAU.

---

## 2. Cost optimization playbook

### The big ones (must-do)
1. **Multi-region Coturn.** Place Coturn near users (NA, EU, SA, AS, OC). Reduces inter-region transit costs and improves session quality.
2. **Self-host the NSFW classifier past 50k DAU.** Open-source CLIP-based models run at ~$0.0001/call on a GPU instance. 10x cheaper than Hive.
3. **Aggressive STUN-first.** Try every ICE strategy before falling back to TURN. Most consumer connections work with STUN if we wait 2 seconds longer.
4. **TURN-TCP only when UDP fails.** TCP relay is ~30% more expensive due to overhead.
5. **Cloudflare in front of API + web.** Free tier handles all our static traffic + DDoS shield.

### Medium wins
6. **Voice-only mode.** Audio is 50-100 kbps vs 800-1500 kbps video. We push voice-only as a feature for "low data" mode, capturing a bandwidth-conscious segment in the process.
7. **Aggressive idle timeouts.** Disconnect sockets after 60s in lobby (vs default 30min keep-alive).
8. **Prisma connection pooling.** PgBouncer in transaction mode, max 50 conns per app instance.
9. **Redis pipeline batching for queue ops.**
10. **Lazy load TURN.** Don't issue TURN credentials until ICE candidates fail — saves ~80% of TURN cred churn.

### Small wins
11. Brotli compression for static
12. Postgres partial indexes on hot queries
13. Cache user identity lookups in Redis with 60s TTL

---

## 3. Concrete cost line items by stage

### Alpha (1k DAU, 100 peak CCU) — **$200/month**
| Service | Provider | Cost |
|---|---|---|
| Web (1 small instance) | Fly.io shared-cpu-1x | $5 |
| API (1 small) | Fly.io shared-cpu-1x | $5 |
| Signaling (1 dedicated) | Fly.io performance-1x | $25 |
| Postgres | Fly.io 1GB | $15 |
| Redis | Upstash free | $0 |
| Coturn (1 region) | Fly.io shared | $20 |
| TURN bandwidth (~1TB) | Fly.io egress | $20 |
| Sentry | Sentry free tier | $0 |
| DNS / CDN | Cloudflare free | $0 |
| Domain + email | Namecheap | $5 |
| Monitoring | Better Stack starter | $30 |
| Moderation API (Hive) | Hive Moderation | $50 |
| Stripe (% of $0 revenue) | — | $0 |
| Buffer | — | $25 |

### Beta (25k DAU, 2.5k peak CCU) — **$1,800/month**
| Service | Cost |
|---|---|
| Compute (3 services, 2 instances each) | $400 |
| Postgres 4GB | $80 |
| Redis 1GB | $50 |
| Coturn (3 regions) | $200 |
| TURN bandwidth (~30 TB) | $600 |
| Moderation (Hive, ~1.2M calls) | $300 |
| CDN / WAF (Cloudflare Pro) | $20 |
| Sentry team | $30 |
| Logs (Better Stack) | $50 |
| Stripe fees (~$3k revenue × 2.9%) | $90 |

### Growth (100k DAU, 10k peak CCU) — **$5,500/month**
| Service | Cost |
|---|---|
| Compute (autoscaled fleet) | $900 |
| Postgres 16GB HA | $250 |
| Redis 4GB cluster | $200 |
| Coturn (5 regions, dedicated VMs) | $800 |
| TURN bandwidth (~100 TB) | $2,000 |
| Self-hosted moderation GPU box (T4) | $400 |
| Object storage (S3, evidence) | $50 |
| Cloudflare Business + bot management | $200 |
| Observability (Sentry + Datadog lite) | $300 |
| Stripe fees | $400 |

### Scale (500k DAU, 50k peak CCU) — **$19,000/month**
| Service | Cost |
|---|---|
| Compute (auto-scaled, multi-region) | $2,500 |
| Postgres HA primary + read replicas | $700 |
| Redis cluster | $500 |
| Coturn (8 regions, fleet of dedicated VMs) | $2,500 |
| TURN bandwidth (~500 TB, with negotiated rates) | $7,500 |
| Self-hosted moderation (3x GPU instances) | $1,500 |
| Object storage | $200 |
| Cloudflare Enterprise (negotiated) | $1,500 |
| Observability stack | $800 |
| Stripe fees | $1,200 |
| Compliance (legal counsel retainer) | $100 |

### Mass (2M DAU, 200k peak CCU) — **$58,000/month**
At this scale we negotiate directly with Cloudflare and a bandwidth provider (Cogent, Lumen). TURN cost per GB drops by ~50%. Compute costs scale sub-linearly. ARR at this point should be $20M+, infra is < 4% of revenue.

---

## 4. The "TURN bandwidth" question

Random video chat lives or dies on TURN cost. Two structural decisions:

1. **We will run our own Coturn fleet from day one** — managed TURN providers (Twilio, Xirsys) are 5-10x more expensive at scale.
2. **We benchmark every architectural change against TURN ratio** — anything that drops the ratio by even 1% is worth weeks of engineering at scale.

### Strategies to reduce TURN ratio
- **Best ICE servers per region** — local STUN servers reduce candidate gathering time, increase chance of P2P succeeding
- **Trickle ICE** — start trying candidates as they arrive instead of waiting for gathering completion
- **TURN over TCP only as last resort** — prefer UDP, fall back to TCP only after 2s
- **Persistent SDP munging** — strip overly restrictive codec preferences from offers
- **Codec negotiation** — prefer VP8/H264 baseline (high compatibility) over VP9/AV1 (lower bitrate but higher CPU = more drops)

---

## 5. What changes per geo

| Region | TURN ratio | Why |
|---|---|---|
| North America | 18% | Mostly home Wi-Fi with permissive NAT |
| Europe | 22% | More carrier-grade NAT in mobile |
| Latin America | 28% | Mobile-heavy, restrictive networks |
| South Asia | 35% | Carrier NAT very common, especially in IN |
| Southeast Asia | 32% | Similar to South Asia |

We adjust pricing and capacity planning by region based on these ratios.
