# YUNO — MVP Roadmap

## Philosophy
Ship the smallest thing that makes the user say *"holy shit, that was a real person."* Every other feature is a distraction until that core feeling is locked in.

The MVP exists to validate three hypotheses:
1. Random video chat still has demand in 2026
2. Users will trust YUNO to moderate it well
3. We can match strangers in < 3 seconds at scale

Everything else — Premium, Verified, Reconnect, even native apps — is a Phase 2 problem.

---

## Phase 0 — Foundation (Weeks 1-4)

**Outcome:** Two laptops on the same Wi-Fi can do a live YUNO call end-to-end.

| Week | Deliverables |
|---|---|
| 1 | Monorepo scaffold, Postgres + Redis up, Prisma schema, .env wiring (✅ this commit) |
| 2 | Signaling server: socket.io + matchmaker queue + WebRTC SDP/ICE relay (✅ in this repo) |
| 3 | API server: guest auth, ICE creds, reports endpoint (✅ in this repo) |
| 4 | Web app: landing → consent → camera → matched → video → skip (✅ in this repo) |

What's working at end of phase 0: the **happy path**, no auth, no moderation, no premium, no mobile polish.

---

## Phase 1 — Public alpha (Weeks 5-10)

**Outcome:** 1,000 invited testers can reliably get matched and have conversations on real networks.

- TURN deployment (Coturn on Fly.io, two regions)
- Mobile-responsive web (Tailwind + framer-motion polish)
- Report button + basic moderation queue (admin dashboard)
- Rate limiting + IP fingerprint based ban list
- Basic captcha at session start (Cloudflare Turnstile)
- Sentry + structured logs
- Privacy policy + ToS + age gate

What's intentionally absent: Premium, Verified, gender filters, country filters, profiles, persistent identity.

---

## Phase 2 — Public beta (Weeks 11-18)

**Outcome:** Open signups, brand identity locked, retention measured, first paying users.

- Email-based optional accounts (still can use as guest)
- **Premium tier** (Stripe checkout, gender + country filter, HD video, priority queue)
- **Verified tier** (Stripe Identity integration)
- Interest tag system + interest-based queue partitioning
- Mod dashboard v2 — live session monitor, evidence-pack export, ban-with-reason
- Real-time NSFW frame classifier (Hive or local CLIP-based)
- TikTok / Instagram social meta tags + share cards
- Localization (English, Spanish, Portuguese, Hindi, Tagalog)
- PWA installability + push notifications (opt-in only, used sparingly)

---

## Phase 3 — Scale (Weeks 19-30)

**Outcome:** 100k+ DAU, sustainable unit economics, native apps.

- Capacitor wrappers for iOS / Android (App Store + Play submission)
- Multi-region matching (geo-affinity in queue)
- Reconnect feature (Premium)
- Highlight clipping with consent (viral feature, see `04-viral-growth.md`)
- Verified badge UI + Verified-only queue
- Reputation scoring system (silent, used for matching priority)
- Audio-only "voice mode" optimization (reduces TURN cost ~70% for users who choose it)
- Trust & safety transparency report (quarterly, public)

---

## Phase 4 — Defensibility (Months 7-12)

**Outcome:** YUNO is the obvious answer to "where do I go for random chat now?"

- Native Coturn fleet across 8 regions (latency < 60ms for 90% of users)
- Custom matchmaking ML (silent, internal — not user-facing AI)
- Trust score recalibration every 24h based on cohort behavior
- Partner API for trusted education/language-learning integrations
- Brand campaigns (subway, podcasts, tier-1 city OOH)
- Founder content engine (YouTube + Twitter) telling the trust story
- Series A fundraise with traction story

---

## Definition of done for MVP (end of Phase 1)

A user with no account, on a phone, on cellular data, opens yuno.app and within **5 seconds** is talking to another human being. They can skip in **one tap**. They can report in **two taps**. The other party sees a notification within **5 minutes** if reported. The product feels **finished**, not beta.

---

## Operational milestones (alongside engineering)

| Month | Operations |
|---|---|
| 1 | Hire 2 part-time moderators, 24-hour coverage via outsourced firm |
| 2 | Set up NCMEC reporting pipeline (CSAM hash matching with PhotoDNA) |
| 3 | Hire head of trust & safety |
| 4 | Build 24/7 in-house mod team in Manila + Lisbon (cost-effective, English-fluent) |
| 6 | Hire first growth marketer |
| 9 | Compliance review: DSA (EU), India IT Rules, age verification per geo |
| 12 | Annual transparency report published |

---

## What we will not ship in year 1 (and why)

| Idea | Why we say no |
|---|---|
| Group chats / 3+ person rooms | Diluted product, much harder moderation, different UX |
| Filters / AR effects | Slows render, distracts from "real" feel, optimization rabbit hole |
| Profiles / friend lists | Inverts the model — we are the un-social network |
| In-app gifting / tipping | Dating-app coded, opens harassment vectors |
| Live streaming | Different product entirely |
| AI conversation starters | Violates the core rule |
| Voice translation / subtitles | Cool, but moves us toward language-learning niche; revisit in year 2 |

These will all be tempting. Each has been the death of a previous random-chat app.
