# YUNO — Business Model

## 1. Tiers

### Free
- Random video / voice / text chat
- Unlimited skips (rate-limited at 30/min for anti-abuse)
- 1 interest tag
- Standard video (480p)
- Optional ads after every 8 skips (interstitial, 5s skippable after 1s)
- Standard matching queue

### Premium — **$9.99 / month** (or $59.99 / year, 50% off)
- Gender preference filter
- Country / region filter
- Up to 5 interest tags
- HD video (720p, 30fps)
- Reconnect history (last 24h, both parties opt-in to be findable)
- Priority queue (matched ~3x faster at peak load)
- Invisible browsing (don't appear in reconnect history of others)
- Creator mode (custom display name visible to matched user, opt-in)
- No ads
- Unlocks "Verified-only" filter (paired with Verified subscribers only)

### Verified Female / Verified Male / Verified Non-Binary — **$2.99 / month**
A separate, optional, identity-verification subscription. NOT a gender-restricted product — anyone of any gender can subscribe to any verified tier. The label simply attests to *what was on the ID*.

- Stripe Identity verification at signup ($2.50 one-time pass-through cost)
- Adds a verified badge visible to matched users
- Can opt into "Verified-only" matching (matches only with other Verified users)
- Reduces shadow-ban probability for false reports (verified users have higher reputation floor)
- Eligible for revenue share on referrals

> **Why this exists:** Random chat collapses into a sausage festival without a deliberate trust-building primitive. Verified-Female (and the equivalent for other genders) gives women a way to opt into safer, more selective matching for the cost of a coffee. It is **not** sold as "talk to verified women." It is sold as "you are verified, so you get filters and trust." The label appears on *both* sides.

## 2. Unit economics (per Daily Active User)

Numbers below assume a steady-state 25k DAU at 90 days post-launch.

| Line item | Cost / Revenue per DAU per day |
|---|---|
| Bandwidth (STUN-routed P2P, 80%) | $0.000 |
| Bandwidth (TURN-relayed, 20%) | $0.012 |
| Postgres + Redis (Fly.io) | $0.003 |
| Compute (web + api + signaling) | $0.005 |
| Moderation API calls (frame sampling) | $0.008 |
| Human moderation labor (allocated) | $0.010 |
| **Total cost / DAU / day** | **$0.038** |
| Ad revenue (free user, 4 impressions) | $0.020 |
| Premium revenue (1.5% conversion, $9.99 ÷ 30) | $0.005 |
| Verified revenue (3% conversion, $2.99 ÷ 30) | $0.003 |
| **Total revenue / DAU / day** | **$0.028** |

> **At 25k DAU we are slightly cash-negative on a per-user basis.** This is expected — the model only works at scale. See `06-infrastructure-cost.md` for the curve.

### Where economics flip positive
- **TURN ratio drops** as we deploy regional Coturn clusters → bandwidth cost falls ~40%
- **Premium conversion lifts** with Verified-only filter as a hook → 3.5%+ realistic
- **Ad CPM rises** with engagement signals → 2x ad revenue at 100k DAU

Break-even modeled at ~80k DAU. Profitable at 200k+ DAU.

## 3. Revenue projection (12 months post-launch)

| Month | DAU | Premium subs | Verified subs | MRR | Burn |
|---|---|---|---|---|---|
| 1 | 5k | 30 | 50 | $450 | $35k |
| 3 | 25k | 350 | 700 | $5.6k | $50k |
| 6 | 60k | 950 | 2.0k | $15.5k | $70k |
| 9 | 110k | 1.9k | 3.8k | $30.3k | $90k |
| 12 | 180k | 3.4k | 6.2k | $52.5k | $110k |

ARR at month 12: **~$630k**, on track for $2M+ by month 18 with sustained growth.

## 4. Cost structure (steady state)

- **Infra:** ~30% of cost (bandwidth, compute, db, Coturn)
- **Moderation labor:** ~25% (24/7 human team, see `12-security.md`)
- **Engineering:** ~30% (4–6 person team after seed)
- **Marketing / paid acquisition:** ~10%
- **Compliance / legal:** ~5%

## 5. What we will not do

| Anti-pattern | Why we refuse |
|---|---|
| Charge to talk to "verified women" | Catfish bait. Destroys the entire trust premise. |
| Pay-per-message economy | Encourages exploitation. Look at OnlyFans random-chat clones. |
| Token / coin systems | Gamifies attention-as-currency. Misaligned with brand. |
| Fake user populations to seed activity | Lying to users is the cardinal sin. |
| Sell user voiceprints / training data | Conversation content is sacred. We do not retain it. |
| Run AI personas as "filler" | Defeats the entire point of the product. |

## 6. Pricing levers we will test

- 7-day free trial of Premium (no credit card required for first 24h)
- $4.99 weekly Premium (impulse-friendly for travelers)
- Verified bundle (Verified + Premium for $11.99)
- Annual discount (50% off second year)
- Student pricing (.edu validation, 50% off)

## 7. Why ads are kept light

We could 5x ad revenue with aggressive interstitials. We won't. The product depends on flow state — every interruption between conversations costs us session length, which costs us retention, which costs us LTV. **Ad revenue compounds linearly; engagement compounds exponentially.** Don't trade the latter for the former.
