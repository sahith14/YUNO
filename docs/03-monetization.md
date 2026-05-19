# YUNO — Monetization

## 1. Stripe object model

```
Customer ────┬─── Subscription (Premium)        $9.99/mo or $59.99/yr
             ├─── Subscription (Verified)       $2.99/mo  (linked to identity verification)
             └─── Subscription (Bundle)         $11.99/mo  (Premium + Verified)

VerificationSession (Stripe Identity)  →  webhook → flips user.verified = true
```

Subscription state changes flow through Stripe webhooks → `apps/api/routes/premium.ts` and `routes/verification.ts` → updates `users.premium_until` and `users.verified_at` columns.

## 2. Free user monetization (ads)

### Placement
- **Skip-interstitial:** After every 8 consecutive skips, show a 5-second skippable video ad. After the ad, the user resumes matching.
- **Idle banner:** If a user is in the lobby (matching, not in a call) for >20 seconds, a non-intrusive banner appears at the bottom.
- **Never inside an active conversation.** The video frame is sacred.

### Networks
- Primary: **Google AdMob (web)** for display, **AppLovin MAX** when native shells ship
- Brand-safe filters: only family-safe + IAP categories (no dating, no gambling, no political)
- Frequency cap: max 3 ads per 30-min session

### Expected eCPM by geo
| Geo | eCPM (USD) | Impressions / DAU / day |
|---|---|---|
| US | $8 | 4 |
| UK / CA / AU | $5 | 4 |
| LATAM | $1.5 | 4 |
| SEA / IN | $0.6 | 4 |
| Blended | $3.5 | 4 = ~$0.014 / DAU / day |

## 3. Premium acquisition flow

### In-product hooks
1. **The "almost-match" hook.** When a free user gets skipped or skips, occasionally show: *"Premium users get matched 3x faster. Try free for 7 days?"* Show this no more than once per 5 sessions.
2. **The "filter-tease" hook.** When a free user taps the (locked) gender filter, show a beautiful upsell modal explaining what unlocks.
3. **The "long-conversation" hook.** After a conversation > 5 minutes, show: *"Want to find them again?"* — pitches the Reconnect feature.

### Funnel
```
Free user
  → sees one of the three hooks (15% see hook in any given session)
  → 8% click through to upsell screen
  → 18% start free trial
  → 60% retain past trial
  → ~0.13% per-session-shown converts to paid

At 25k DAU and ~3 sessions/day, that's ~10/day new conversions = 300/month.
At 12-month LTV ~$72 (avg subscriber lifetime 7.2 months × $9.99/mo), that's $21k of monthly LTV created from conversions alone.
```

### Cancellation handling
- One-tap cancel from settings, no dark patterns
- "We'll keep your benefits until [date]" message
- Optional one-question survey ("why are you leaving?")
- Re-engagement offer at 50% off if they return within 30 days

## 4. Verified subscription flow

```
User taps "Get Verified" in settings
  → Stripe Checkout for $2.99/mo subscription
  → Subscription is in "incomplete" state until verification passes
  → User completes Stripe Identity verification (selfie + ID, ~90s)
  → Webhook: identity.verification_session.verified
    → API marks user.verified_at = now()
    → API marks user.verified_doc_gender (only stored for the optional "Verified Female" badge label)
    → Subscription becomes active
```

If verification fails, subscription is canceled and refunded automatically. We never charge for failed verification.

### What we store from the ID
- A SHA-256 hash of the document number (for duplicate detection across accounts)
- Year of birth (to enforce 18+, never the full DOB)
- Reported gender (only as a label for the badge)
- Country of issue (for region matching)
- **We never store the document image, full name, full DOB, or address.**

Stripe Identity holds the raw data per their retention policy. Our database only ever sees the derived attributes above. This is documented in our privacy policy.

## 5. Payment integration files

| File | Purpose |
|---|---|
| `apps/api/src/routes/premium.ts` | Create checkout session, manage subscription |
| `apps/api/src/routes/verification.ts` | Create verification session, handle webhook |
| `apps/api/src/lib/stripe.ts` | Stripe client wrapper |
| `apps/web/src/app/upgrade/page.tsx` | Upgrade UI |
| `apps/web/src/app/verify/page.tsx` | Verification UI |

## 6. Future revenue lines (post month 12)

- **Branded interest packs** — partnerships with brands (e.g., music labels seeding "concerts" interest with related ads)
- **API for trusted partners** — let language-learning apps embed YUNO as their conversation primitive
- **Anonymous Q&A events** — paid timed events with creators in random-chat format
- **Gift mechanics** — only for matched-and-mutual users, low priority because it edges close to creator-monetization which we're avoiding

## 7. What we explicitly will NOT monetize

- The right to talk to anyone (gating identity behind paywall = catfish)
- Identity reveal (we will never sell "see who you matched with yesterday")
- Conversation content (no transcripts sold for AI training)
- Microtransactions (no coins, no boosts, no super-likes)
