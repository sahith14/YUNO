# YUNO — SEO Strategy: Capturing Post-Omegle Search Traffic

> The goal: when someone searches "omegle alternative", "sites like omegle", or "random video chat", YUNO appears in the results. Done legally, sustainably, and without trademark infringement.

## 1. The opportunity

Omegle shut down in November 2023. The search demand didn't.

Estimated monthly Google searches (US-only, mid-2026):

| Query | Volume |
|---|---|
| `omegle alternative` | ~165,000 |
| `sites like omegle` | ~90,000 |
| `omegle replacement` | ~22,000 |
| `random video chat` | ~135,000 |
| `talk to strangers` | ~45,000 |
| `chatroulette alternative` | ~18,000 |
| `video chat with strangers` | ~30,000 |
| Plus 50+ long-tail variations | ~200,000 |

**Total addressable monthly search demand: ~700K queries** in English alone. Multiply by ~3x for global English + localized queries.

If we capture **1%** of "omegle alternative" via organic SEO, that's ~50,000 monthly visitors **for free**.

## 2. The legal basis: nominative fair use

We use the word "Omegle" on our site. This is **legal** under the doctrine of **nominative fair use** (US: New Kids on the Block v. News America Publishing, 9th Cir. 1992), which has three requirements:

1. The product/service must not be readily identifiable without using the trademark — ✓ "alternative to ___" requires the original name
2. Only as much of the mark as reasonably necessary may be used — ✓ we use "Omegle" as a word, not their logo, not their typography, not their color scheme
3. The user must do nothing that would suggest sponsorship or endorsement — ✓ we explicitly state "YUNO is not affiliated with Omegle" on every page that mentions them

**Where we use "Omegle" on the site:**
- Meta titles & descriptions (descriptive)
- H2 subheadings ("modern Omegle alternative")
- Body copy in comparison context
- The dedicated `/omegle-alternative` and `/vs/omegle` pages
- FAQ structured data
- Trademark disclaimer at the bottom of any page mentioning Omegle

**Where we DO NOT use "Omegle":**
- Brand name (we are YUNO, not "Omegle 2", not "OmegleNew")
- Domain name (no `omegle-anything.com`)
- App icon, logo, or any visual identity
- Marketing in a way that implies endorsement
- Adwords ads claiming to BE Omegle

This is the same approach Slack uses ("the email replacement"), Notion uses ("the Evernote alternative"), and dozens of legit competitors take. It's well-established, low-risk, and protected.

## 3. What's implemented (this commit)

### Meta layer
- Comprehensive `metadata` in `apps/web/src/app/layout.tsx` with 18 targeted keywords
- Per-page `metadata` exports for `/omegle-alternative` and `/vs/omegle` with custom titles, descriptions, and canonical URLs
- Open Graph and Twitter Card images (placeholder until real OG images are designed)

### Structured data (JSON-LD)
- `WebSite` schema on landing — eligible for sitelinks search box
- `SoftwareApplication` schema with rating, pricing, category — eligible for App rich result
- `FAQPage` schema with 8 Q/As — eligible for FAQ rich snippet (the boxed Q&A you see in Google results)
- `BreadcrumbList` schema on subpages — improves URL display in search results
- `Article` schema on `/omegle-alternative` — eligible for Article rich card

### Content layer
- **Landing page** (`/`): H1 + H2 + body copy organically uses "Omegle alternative" in fair-use comparison framing. 8-Q FAQ section using `<details>` for collapse + JSON-LD for snippet eligibility.
- **`/omegle-alternative`**: dedicated long-form page (~700 words) targeting the exact "omegle alternative" query. Article-style with H1, structured H2s, internal links.
- **`/vs/omegle`**: head-to-head comparison page with a 21-row feature table. This is the highest-converting page format for "X vs Y" queries and ranks fast because table content is easy for Google to parse.

### Crawlability
- `sitemap.ts` → auto-served at `/sitemap.xml`, lists all 6 indexable URLs with priorities
- `robots.ts` → auto-served at `/robots.txt`, allows everything except `/admin`, points to sitemap

## 4. What still needs to happen (action items)

### Immediate (before any meaningful SEO actually works)
1. **Buy a real domain.** `*.trycloudflare.com` URLs change and Google won't waste crawl budget on them. Even `yunochat.in` for ₹93–₹1,799 makes everything below work.
2. **Submit to Google Search Console** at https://search.google.com/search-console once on a real domain. Add the property, submit `/sitemap.xml`. This tells Google "I exist; please come crawl."
3. **Submit to Bing Webmaster Tools.** Same idea, ~10% of search market.
4. **Create real OG images.** Right now `/og-default.png` is referenced but doesn't exist. Need 1200×630 PNG with brand. Affects social shares (TikTok, Twitter, WhatsApp link previews) much more than SEO directly.

### Short-term (first 30 days post-domain)
1. **Backlinks from listicles.** Email outreach to:
   - Reddit posts asking "what replaced Omegle?" — drop a non-spammy comment
   - Tech bloggers covering "best Omegle alternatives 2026" listicles
   - College subreddits, language-learning communities
   - Product Hunt launch
2. **Reddit launch.** Posts to /r/InternetIsBeautiful, /r/Apps, /r/CasualConversation, /r/ChatRoulette (yes, that's a real sub). Focus on the safety + design angle, not "we replaced Omegle" (which reads as spam).
3. **TikTok content.** Short clips of (consented) YUNO conversations with the hashtag #omeglealternative. Even a few hundred views per video adds up.
4. **YouTube videos.** "I tried YUNO — the new Omegle" — even a 60-sec video can rank for the query.

### Medium-term (months 2–6)
1. **Programmatic SEO pages.** Generate pages like:
   - `/talk-to-strangers-from/{country}` (200 country pages)
   - `/random-chat/{interest}` (60 interest pages, one per curated tag)
   - `/omegle-alternative/{country}` (ranks for "omegle alternative india", etc.)
2. **Comparison content.** Add `/vs/chatroulette`, `/vs/monkey`, `/vs/camsurf`, `/vs/ome-tv`. Each captures search demand for that competitor's name.
3. **Glossary / docs pages.** "What is WebRTC?", "Is Omegle safe?", "Why did Omegle shut down?" — informational queries with high volume, low competition.

### Long-term (6+ months)
1. **App Store SEO** when native iOS/Android apps ship. Same keyword research applies, just in App Store Connect and Play Console.
2. **Localized landing pages** — `/es`, `/pt`, `/hi`, `/id` etc. targeted with local keywords.
3. **Brand-vs-feature pages**. As we accumulate features (HD, country filter, voice mode), each becomes a search target.

## 5. Paid acquisition: bidding on competitors' keywords

You can also **bid on "omegle"** in Google Ads (it's legal — Google explicitly allows bidding on competitor trademarks as long as the ad text doesn't infringe). This is the fastest way to get traffic, but expensive.

Estimated CPC for these keywords:
- `omegle alternative` — $1.20–$2.50
- `random video chat` — $0.80–$1.50
- `talk to strangers` — $0.50–$1.20
- `omegle` (just the brand) — $0.30–$0.80 (low because of dead site)

At ~$1 CPC and our funnel (8% click → 1.5% premium conversion), CAC for a Premium subscriber is roughly **$83**. With LTV ~$72 (avg 7.2-month sub × $9.99 — but at $2.99 our LTV is ~$22), this is **massively negative**. Don't run paid Search Ads for now. **Organic SEO is the only path that pencils out at this stage.**

Where paid does pencil:
- **TikTok / Meta** to drive installs (CPI typically $0.40–$1.20 in India, $1.50–$3 in US)
- **Reddit ads** in adjacent communities — cheap and high-intent
- **YouTube pre-roll** on Omegle-related videos — high intent, $0.05–$0.10 per view

## 6. What success looks like

| Metric | Month 3 (no paid) | Month 6 | Month 12 |
|---|---|---|---|
| Indexed pages on Google | ~10 | ~80 (programmatic) | ~300 |
| Avg position for "omegle alternative" | 50–80 | 15–25 | 5–10 |
| Organic monthly visits | 500 | 5,000 | 50,000 |
| Organic install rate (visit → guest signup) | 20% | 22% | 25% |
| Free → Premium conversion | 1.5% | 1.8% | 2.5% |

If we hit page 1 of Google for "omegle alternative" by month 12, organic alone funds the company. That's the goal.

## 7. Anti-patterns we will NOT do

- ❌ Use "Omegle" in our brand name, domain, or app title
- ❌ Copy Omegle's logo, color scheme, or typography
- ❌ Claim to BE Omegle in any ad copy
- ❌ Buy expired domains that contain "Omegle"
- ❌ Run black-hat SEO (link farms, hidden text, doorway pages)
- ❌ Pay for fake reviews or stars
- ❌ Stuff keywords unnaturally into copy

These all work short-term and burn the brand long-term. We're playing for years, not weeks.

## 8. References

- [USPTO: Omegle trademark](https://uspto.report/TM/87212823)
- [Nominative fair use, Cornell LII](https://www.law.cornell.edu/wex/nominative_fair_use)
- [Google's official docs on bidding on competitor trademarks](https://support.google.com/google-ads/answer/6118)
- Search volume estimates from Ahrefs / SEMrush snapshots, mid-2026
