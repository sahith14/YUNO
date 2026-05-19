# YUNO — Strategy

## 1. Why now

Three structural shifts make this market viable in a way it wasn't in 2009:

1. **WebRTC is mature.** Sub-second peer-to-peer video runs in every modern browser. We don't need plugins, native apps, or media servers for the core flow.
2. **Moderation infra is a commodity.** Hive, AWS Rekognition, and open-source CLIP-based classifiers turn what used to be impossible (real-time NSFW detection on 1M streams) into an API call.
3. **Loneliness is a recognized epidemic.** The US Surgeon General declared it a public health crisis in 2023. Users are explicitly searching for "human contact" products — see the explosion of AI-companion apps. We offer the real thing.

## 2. Market sizing

- **Omegle peak:** ~70M MAU, ~1.5M concurrent
- **Adjacent markets we siphon from:**
  - Discord random-call servers (~30M MAU active in voice-chat channels)
  - Bumble BFF / Wizz / random-friend apps (~15M MAU combined)
  - Replika & AI companions (~25M MAU, but ~30% explicitly state preference for humans)
- **Realistic 3-year capture target:** 15M MAU, 3M DAU, 500k peak CCU

## 3. Positioning

**Tagline:** *"Real strangers. Real conversations."*

| Axis | YUNO | Omegle (legacy) | Discord | Replika |
|---|---|---|---|---|
| Unit of interaction | 1:1 random | 1:1 random | N:N persistent | 1:1 with AI |
| Identity | Anonymous (optional verify) | Anonymous | Persistent handle | Persistent |
| Friction to first chat | < 3s | ~5s | High (join server, find channel) | Low |
| Mobile UX | Native-grade web | Broken | Good | Good |
| Moderation | First-class | Broken | Server-by-server | N/A |
| Brand vibe | Cinematic, warm | Toxic | Gamer / community | Lonely / clinical |

We win on **craft**, **trust**, and **speed**.

## 4. Defensibility

The market has tried this before (Chatroulette, Camsurf, OmeTV, Monkey). Most failed because:

1. They were content moderation nightmares with no plan
2. They monetized too aggressively too early ($X to talk to women → catfish hellscape)
3. The brand became a punchline and could not recover
4. They were technically lazy — same flow Omegle had in 2009

YUNO's moats are not technical (WebRTC is open) but **operational**:

- **Trust & safety operations** — A 24/7 human review team with sub-5-min response time. This costs money and takes time to build; competitors can't copy it overnight.
- **Brand integrity** — A premium aesthetic and a clear "no AI, no fakes" stance separates us from the catfish bazaar that random-chat became.
- **Verified ratio** — Every Verified user we add makes the next stranger interaction safer, which compounds. Network effect through trust, not through graph.
- **Distribution loops** — TikTok-native virality (see `04-viral-growth.md`), unlike legacy apps that depended on word-of-mouth.

## 5. The wedge

Launch wedge: **"the safest, prettiest place to talk to a stranger."** Specifically targeting the *post-Omegle refugee* demographic — people who used Omegle, now have nowhere to go, and remember Chatroulette as creepy.

Launch geos (in order):
1. **Tier 1:** US, UK, Canada, Australia (English, high ARPU, content-policy-friendly)
2. **Tier 2:** Brazil, Mexico, Philippines, India (high engagement, lower ARPU)
3. **Tier 3:** EU + Japan + South Korea (compliance-heavy, launch when DSA / age-verification flow is bulletproof)

We do **not** launch in markets where age verification can't be enforced or where regulatory exposure outweighs revenue (e.g., regions with mandatory ID submission for any video communication).

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| CSAM / child exposure | Existential | Mandatory NSFW + age classifier on every stream, instant ban + NCMEC report, age gate at signup, IP reputation scoring |
| App-store rejection | High | Stay PWA-first for v1, native shells (Capacitor) only after moderation track record |
| Toxic brand association | High | Aggressive moderation marketing, partnership with safety NGOs, public transparency reports |
| Coturn bandwidth costs explode | Medium | Aggressive STUN-first routing, regional Coturn clusters, hard cap on TURN-relayed sessions for free users |
| Bot/farm accounts | Medium | Device fingerprint, IP reputation, behavioral entropy scoring |
| Regulatory (DSA, GDPR, India IT Rules) | Medium | Region-aware feature flags, EU data residency, transparent legal contact |

## 7. North-star metric

**Median Time-To-Quality-Conversation** (TTQC) — minutes from app open to first conversation > 60 seconds where neither user skipped or reported.

Target at launch: **< 90 seconds**.
At scale: **< 45 seconds**.

This single metric encodes matching speed, match quality, and moderation effectiveness. It is the only dashboard the founding team should look at daily.
