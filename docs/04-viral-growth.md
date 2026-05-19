# YUNO — Viral Growth

## 1. Why this product is naturally viral

Random video chat has the highest viral coefficient of any social product format because:

1. **Every conversation is a story.** Surprise, weirdness, beauty, awkwardness — all of it is shareable.
2. **Two users per session.** Every install creates a chance to mention the app to one human.
3. **TikTok rewards the format.** "POV: I matched with…" is its own genre.
4. **Anonymity removes posting friction.** No identity to protect, no clout to lose.

Omegle never built for this; we will. **Virality is not an output of the product, it is a feature of it.**

## 2. K-factor target

```
K = (invites per user) × (conversion rate of invite)
```

We model:
- 0.6 invites per active user per week (organic mentions, screenshots, recordings)
- 0.18 conversion rate (people who see content and try the app)
- **K ≈ 0.108 per week → 0.43 per month**

A K of 0.43/mo means each cohort retains ~43% of itself in net new acquisition every month, before paid marketing. Sustainable growth without burning ads is feasible until ~250k DAU.

## 3. Designed-for-virality features

### Highlight clipping (post-MVP, month 3)
- After a > 60-second mutual conversation, both users get a button: *"Save this moment"*.
- If both consent, the last 15 seconds of video are encoded client-side, watermarked with a YUNO badge, and saved locally.
- We never auto-record, never store on our servers without consent, and never share without both parties' explicit opt-in.
- The watermark is the growth vector — clips end up on TikTok with the YUNO mark.

### Shareable conversation cards
- After a long conversation, generate a beautiful card image with: country flags of both participants, conversation duration, an inside-joke phrase auto-extracted (with consent), a YUNO QR code.
- One-tap share to Instagram Story, Snapchat, TikTok.
- This is the *non-video* path to virality.

### Interest hashtags
- Interest tags double as viral primitives. *"Looking for: vinyl collectors"* → users post that on Twitter/IG/TikTok, friends discover.
- We promote interesting tags in the lobby ("People are talking about: late-night-drives, kpop, indie-games").

### Referral program
- Verified users get $0.50 / month off for every Verified referral that converts.
- Caps at $2.99/mo (free Verified at 6 active referrals).
- This is the only direct incentive — kept small intentionally.

## 4. Distribution channels

### Phase 0 (pre-launch, weeks -8 to 0)
- Build a TikTok account showing edited-down, consented clips of test sessions
- Build the waitlist: simple landing page, email capture, share to skip the queue
- Goal: 50k waitlist before public launch

### Phase 1 (launch, months 1-3)
- Open the gates to waitlist 5k/day
- Seed conversations: pay 50 micro-influencers ($300-1k each) to do "I tried YUNO for 24 hours" content
- Reddit launch: r/Apps, r/InternetIsBeautiful, r/CasualConversation
- Product Hunt launch with proper trust narrative ("Omegle, but rebuilt for safety")

### Phase 2 (months 3-6)
- Localized launches: BR, MX, PH, IN
- Local creator partnerships in each market
- Reactive PR — when a TikTok of a YUNO conversation goes viral, amplify with paid spend

### Phase 3 (months 6-12)
- Native apps (Capacitor / React Native shells)
- Performance marketing on Meta + TikTok ads (only after CAC is proven < LTV)
- Brand campaigns in tier-1 cities (subway ads in NYC and LA — high signal, low budget)

## 5. Retention loops

These are the loops that bring users back, ranked by importance:

1. **The dopamine loop.** Random reward → variable interval → comes back. This is intrinsic to the format and requires zero engineering.
2. **The reconnect loop.** Users who had a great conversation are nudged: "Want to try to find Sara from yesterday again?" Premium-only. This drives retention *and* upgrade conversion.
3. **The interest loop.** Users with a saved interest are nudged when others are talking about it: "There are 23 people online who chose 'kpop' tonight."
4. **The streak loop (light touch).** A small badge for 3-day, 7-day, 30-day streaks. No notifications, no penalties for missing days. This is intentionally subtle — we are not TikTok.
5. **The clip loop.** Users who saved clips get a gentle reminder (in-app, not push) to share them.

### What we explicitly avoid
- Push notifications begging users to come back
- "Sara is online now!" notifications (creepy, and we don't have persistent identities)
- Fake "5 people in your area" prompts (lying to users = brand poison)
- Streak shame ("you'll lose your 12-day streak!")

## 6. The viral content engine (internal)

A 1-person team operates a TikTok / Instagram / Twitter / YouTube Shorts content cell:

- Posts 3-4 times daily across channels
- Pulls (with consent) from clips users opt to share publicly
- Reacts within 2 hours to any organic viral mention of YUNO
- Maintains a "vibes deck" — a curated library of approved B-roll and conversation snippets to remix

This is one of the most underrated growth roles in modern consumer apps and we hire for it before we hire a second backend engineer.

## 7. Numbers to hit

| Metric | M3 | M6 | M12 |
|---|---|---|---|
| K-factor (monthly) | 0.30 | 0.40 | 0.50 |
| Organic install share | 70% | 75% | 80% |
| 7-day retention | 18% | 25% | 32% |
| 30-day retention | 8% | 12% | 18% |
| TikTok mentions / week | 50 | 250 | 1500 |
| Waitlist→active conversion | 35% | n/a | n/a |
