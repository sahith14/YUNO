# YUNO — Architecture

## 1. High-level diagram

```
                                    ┌─────────────────────┐
                                    │     Cloudflare      │
                                    │  (CDN, WAF, DDoS,   │
                                    │   Turnstile, DNS)   │
                                    └──────────┬──────────┘
                                               │
                ┌──────────────────────────────┼──────────────────────────────┐
                │                              │                              │
        ┌───────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
        │   Web (Next)   │  REST/SSR  │  API (Fastify)  │  Socket.IO │   Signaling     │
        │  apps/web      │◀──────────▶│  apps/api       │            │   apps/signaling│
        │  port 3000     │            │  port 4000      │            │   port 4001     │
        └────────┬───────┘            └────────┬────────┘            └─────┬───────┬───┘
                 │                             │                           │       │
                 │ WebRTC offer/answer/ICE     │                           │       │
                 └─────────────────────────────┼───────────────────────────┘       │
                                               │                                   │
                                       ┌───────▼─────────┐                         │
                                       │   Postgres 16   │                         │
                                       │  Prisma client  │                         │
                                       │  packages/db    │                         │
                                       └─────────────────┘                         │
                                                                                   │
                                       ┌───────────────────────────────────────────▼─┐
                                       │                  Redis 7                    │
                                       │  - matchmaking queue (sorted sets)          │
                                       │  - presence (hashes)                        │
                                       │  - rate limits (counters w/ TTL)            │
                                       │  - pub/sub between signaling instances      │
                                       │  - socket adapter (socket.io-redis)         │
                                       └─────────────────────────────────────────────┘

                            ┌────────────────────────────────────────────┐
                            │            Coturn (STUN + TURN)            │
                            │  Multi-region UDP / TCP / TLS              │
                            │  Time-based credentials issued by API      │
                            └────────────────────────────────────────────┘
                                               ▲
                                               │  ICE candidate gathering & relay
                                               │
                          ┌────────────────────┴───────────────────────┐
                          │                                            │
                   ┌──────▼──────┐                              ┌──────▼──────┐
                   │   User A    │       WebRTC P2P media       │   User B    │
                   │  (browser)  │◀────────────────────────────▶│  (browser)  │
                   └─────────────┘     (or TURN-relayed if      └─────────────┘
                                       NAT traversal fails)
```

## 2. Service responsibilities

### `apps/web` — Next.js 14
- Landing page, marketing pages
- Lobby UI: interest selection, camera/mic preview
- Chat room UI: video tiles, controls, text panel, report
- Admin dashboard (route group `/admin/*`, gated by JWT role claim)
- Server-rendered share cards for virality
- **Does not** handle media. Pure UI + thin client logic.

### `apps/api` — Fastify
- Stateless HTTP REST. Horizontally scalable.
- Issues guest JWTs (no email required) and user JWTs (email-verified)
- Mints time-based TURN credentials (HMAC-SHA1 over `expiry:username`)
- Reports CRUD, ban management, reputation queries
- Stripe webhooks (premium, verification)
- Admin endpoints (gated by role claim + IP allowlist in prod)

### `apps/signaling` — Fastify + Socket.IO
- Stateful only at the socket level (state itself lives in Redis)
- Matchmaker: pulls from interest-aware sorted sets, pairs strangers, creates rooms
- WebRTC SDP/ICE relay: forwards offer/answer/candidate between matched peers
- Presence: tracks who's in queue, who's in a call
- Skip/next: tears down room, returns both users to queue
- Uses `socket.io-redis-adapter` so multiple signaling instances share state

### `packages/db` — Prisma
- Single source of truth for the database schema
- Re-exports a typed Prisma client for use in `apps/api` (signaling does NOT touch Postgres directly — only Redis + occasional API calls)

### `packages/shared` — TypeScript types
- Socket.IO event contract (typed both ends)
- Zod schemas for REST request/response
- ICE server config helpers
- Constants (rate limits, queue keys, error codes)

## 3. Why Fastify, not Express
- 2-3x faster JSON throughput
- Built-in schema validation (json-schema → typescript)
- First-class plugin system → cleaner dependency injection
- TypeScript-native types

## 4. Why Socket.IO, not raw WS
- Built-in reconnection logic (matters on mobile)
- Rooms primitive maps directly to our matched-pair model
- The `socket.io-redis-adapter` solves multi-instance broadcasting trivially
- Acks → request/response semantics over WS without us writing a message-id system

## 5. Why split signaling from API
| Reason | Detail |
|---|---|
| Different scaling profile | API scales with HTTP traffic; signaling scales with concurrent users |
| Different stateful needs | API is stateless; signaling has long-lived sockets |
| Different deploy cadence | We don't want a frontend-only ship to bounce active calls |
| Different fault tolerance | Signaling crash kicks everyone in calls. We want it isolated. |

## 6. Data flow: a single conversation, end-to-end

```
T+0ms     User A opens yuno.app
T+50ms    Web → API POST /auth/guest → returns guest JWT (1d TTL)
T+200ms   Web → Signaling (Socket.IO) connect with JWT in handshake.auth
T+300ms   Web → API POST /ice/credentials → returns STUN+TURN config
T+500ms   User A grants camera/mic permission
T+1000ms  User A taps "Start" → web emits queue:join { interests: [...] }
T+1100ms  Signaling: ZADD matchmaking:queue { score: now, member: socketId }
                     HSET presence:{userId} { state: "queued" }
T+1200ms  User B is already in queue, matchmaker pairs A+B
T+1250ms  Signaling: HSET presence both → "in_call"
                     creates room "room:{uuid}"
                     emits match:found to both with peerInfo + roomId
T+1300ms  Web (A) creates RTCPeerConnection with ICE servers
T+1350ms  Web (A) createOffer → emit signal:offer
T+1400ms  Signaling forwards offer to socket B
T+1450ms  Web (B) setRemoteDescription, createAnswer, emits signal:answer
T+1500ms  Signaling forwards answer to A
T+1500ms+ Trickle ICE candidates flow: signal:ice-candidate either direction
T+~2500ms ICE connected, video flowing
T+~3000ms Both onicestateconnected → emit room:ready → UI shows the other person

T+~180s   User A taps Skip → emit room:skip
T+~180s   Signaling tears down room, both back to queue
```

## 7. Horizontal scaling

| Service | Strategy |
|---|---|
| Web | Stateless, scale on CPU. CDN caches static. |
| API | Stateless. Scale on RPS. PgBouncer in front of Postgres. |
| Signaling | Stateful sockets. Scale by adding instances; socket.io-redis-adapter handles broadcast. Sticky sessions at LB. |
| Postgres | Vertical first (Fly.io managed up to 32 vCPU). Read replicas for admin dashboard queries. |
| Redis | Sentinel or Redis Cluster past 25k CCU. |
| Coturn | Multi-region. Geo-DNS routing. |

## 8. Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Postgres down | API auth fails, but existing sessions continue (signaling caches recent JWT validations in Redis) | HA Postgres, 60s in-Redis JWT cache |
| Redis down | Catastrophic — matchmaking and presence break | HA Redis Sentinel; signaling falls back to in-process queue with reduced features |
| Single signaling instance crash | Active sessions on that instance drop; users return to queue automatically | socket.io-redis-adapter; clients auto-reconnect |
| Coturn region down | Users in that region take longer to connect (fall through to other regions) | Multi-region with health checks; client picks lowest-latency healthy region |
| ICE/TURN credential service slow | New connections queue but don't fail | Credentials cached client-side for 1h |

## 9. Repos at a glance

```
apps/
  web/              Next.js 14 app router
    src/app/        routes
    src/components/ React components
    src/hooks/      useSocket, useWebRTC, useMedia
    src/lib/        client lib (api, socket, webrtc)
  api/              Fastify
    src/routes/     auth, ice, reports, premium, verification, admin
    src/lib/        prisma, redis, stripe, jwt
    src/plugins/    auth, rate-limit, error-handler
  signaling/        Fastify + Socket.IO
    src/socket/     event handlers
    src/match/      matchmaker, queue, room
    src/lib/        redis, jwt
packages/
  db/               Prisma schema + client
  shared/           types, events, zod, ice helpers
```
