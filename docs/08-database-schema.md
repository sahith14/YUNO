# YUNO — Database Schema

The full Prisma schema lives in [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma). This doc explains the design decisions and access patterns.

## Design principles
1. **Conversations are not persisted.** We only store metadata (start, end, peers, duration). Content stays peer-to-peer.
2. **Every PII column is opt-in.** Guest users have no PII. Email, phone, and verification fields are nullable.
3. **Hard-deletable.** Every user-owned row joins back to `users.id` so a single delete cascades correctly for GDPR right-to-erasure.
4. **Audit trail for moderation, not for surveillance.** Reports + bans + moderation actions are durable; chat content is not.

## Entity relationships

```
users ──┬─< sessions           (a user can have many sessions, sessions reference 2 users)
        ├─< reports             (filed by user)
        ├─< reports_against     (filed against user)
        ├─< bans                (active or historical bans)
        ├─< user_interests      (M:N with interests)
        ├─< premium_subs        (Stripe subscription state mirror)
        ├─< verification        (1:1, optional)
        ├─< reputation_events   (audit trail of reputation changes)
        └─< reconnect_tokens    (only for premium reconnect feature)

interests ──< user_interests
moderation_actions ──> users (reviewer FK)
                  ──> reports (FK)
```

## Tables

### `users`
The core identity row. **One row per browser identity** (cookie + device fingerprint), not per email. Guest users get a row immediately; they can later attach an email.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| created_at | timestamptz | |
| last_seen_at | timestamptz | updated on each socket connection |
| display_handle | text? | optional, only set if Premium creator-mode |
| email | citext? | unique if present |
| email_verified_at | timestamptz? | |
| password_hash | text? | argon2id, only if email user |
| device_fingerprint_hash | text | sha256(canvas+UA+timezone+...) |
| ip_country | text? | latest known country code (2 letters) |
| reputation_score | int | default 1000, clamped 0..2000 |
| premium_until | timestamptz? | mirrored from Stripe |
| verified_at | timestamptz? | mirrored from Stripe Identity |
| verified_label | text? | "female" / "male" / "non-binary" — what was on the ID |
| age_year | int? | year of birth only, never DOB |
| is_admin | boolean | default false; for moderation dashboard access |
| is_shadow_banned | boolean | default false |
| ban_until | timestamptz? | active hard ban |
| created_country | text? | first-seen country, for cohort analysis |
| locale | text? | "en", "es", etc |
| consent_age_18 | boolean | default false; required to enter chat |
| consent_terms_at | timestamptz? | |
| privacy_invisible | boolean | default false (Premium "invisible browsing") |
| accepts_reconnect | boolean | default true |

**Indexes**
- `(email)` unique
- `(device_fingerprint_hash)` for ban evasion detection
- `(reputation_score)` partial WHERE NOT shadow_banned (matchmaking)
- `(ban_until)` partial WHERE ban_until > now()

### `interests`
Curated tag dictionary. We do NOT let users free-text interests — that becomes a moderation nightmare and it pollutes the queue. ~200 curated tags at launch, more added based on demand.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text unique | "kpop", "late-night-drives" |
| label | text | display label |
| category | text | "music", "lifestyle", "language" |
| is_active | boolean | mod can disable |
| created_at | timestamptz | |

### `user_interests`
M:N. A user can have up to 1 (free) or 5 (premium) interests.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid FK | |
| interest_id | uuid FK | |
| added_at | timestamptz | |

PK: `(user_id, interest_id)`. Index on `interest_id` for queue lookup.

### `sessions`
A "session" is a single matched conversation. Created when match happens, closed when either party skips/disconnects. **No content stored** — only metadata.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_a_id | uuid FK | always lower UUID for symmetry |
| user_b_id | uuid FK | always higher UUID |
| started_at | timestamptz | |
| ended_at | timestamptz? | null = active |
| ended_reason | text? | "skip_a", "skip_b", "disconnect_a", "disconnect_b", "report_a", "report_b", "moderator", "system" |
| modality | text | "video", "audio", "text" |
| ice_relay_used | boolean | true if TURN was used (for cost analysis) |
| matched_via | text | "random", "interest:kpop", "premium_filter:female+US" |
| reported | boolean | default false |

**Indexes**
- `(started_at desc)` for recency queries
- `(user_a_id, started_at desc)` and same for `user_b_id`
- partial `(ended_at IS NULL)` for active session lookup

### `reports`
A report is filed by the reporter against the reportee for a given session.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| reporter_id | uuid FK → users | |
| reportee_id | uuid FK → users | |
| category | text | "nsfw", "minor", "harassment", "violence", "scam", "other" |
| note | text? | optional free text up to 500 chars |
| evidence_s3_key | text? | optional pre-signed thumbnail capture |
| status | text | "pending" / "actioned" / "dismissed" / "auto_actioned" |
| created_at | timestamptz | |
| actioned_by | uuid FK → users? | reviewer |
| actioned_at | timestamptz? | |
| action_taken | text? | "warn", "shadow_ban_24h", "ban_7d", "ban_perm", "dismiss" |

**Indexes**
- `(status, created_at)` for moderation queue
- `(reportee_id, created_at desc)` for "show me all reports against user X"
- `(reporter_id, created_at desc)` for spam detection

### `bans`
Durable ban record. A user can have multiple historical bans; `users.ban_until` reflects the active one for hot-path checks.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| device_fingerprint_hash | text? | apply ban to fingerprint too |
| ip_cidr | inet? | optional IP-block ban (for abuse rings) |
| reason | text | |
| starts_at | timestamptz | |
| ends_at | timestamptz? | null = permanent |
| issued_by | uuid FK → users? | null = automated |
| created_at | timestamptz | |

### `premium_subs`
Mirror of Stripe subscription state. Source of truth is Stripe; this is just for fast joins.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK unique | |
| stripe_customer_id | text | |
| stripe_subscription_id | text unique | |
| product | text | "premium" / "verified" / "bundle" |
| status | text | "active" / "trialing" / "past_due" / "canceled" |
| current_period_end | timestamptz | |
| cancel_at_period_end | boolean | |
| updated_at | timestamptz | |

### `verifications`
1:1 with users (a user can only be verified once). Stores derived attributes only — never raw ID data.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK FK | |
| stripe_verification_session_id | text | |
| status | text | "verified" / "rejected" / "pending" |
| document_hash | text | sha256 of normalized document number — duplicate detection |
| reported_gender | text | "female" / "male" / "non-binary" |
| year_of_birth | int | |
| document_country | text | ISO-2 |
| verified_at | timestamptz | |

**Index**
- `(document_hash)` unique → blocks the same ID being reused on multiple accounts

### `match_logs`
Lightweight log of every match attempt — used to compute matching latency and queue health. Aggressive retention (30 days).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| joined_queue_at | timestamptz | |
| matched_at | timestamptz? | null = still waiting |
| left_queue_at | timestamptz? | null = matched |
| filters_json | jsonb | {gender, country, interests} |

### `reputation_events`
Audit log of reputation deltas. Useful for tuning the algorithm.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| delta | int | +/- |
| reason | text | "long_session", "report_filed", "report_received", "ban", "good_streak" |
| created_at | timestamptz | |

### `reconnect_tokens`
Short-lived opt-in tokens that let two users find each other again. Premium feature.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| issued_to | uuid FK → users | |
| target_user_id | uuid FK → users | |
| expires_at | timestamptz | |
| consumed_at | timestamptz? | |

### `moderation_actions`
Audit log of every moderator action.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| moderator_id | uuid FK → users | |
| target_user_id | uuid FK → users | |
| report_id | uuid FK → reports? | |
| action | text | |
| notes | text? | |
| created_at | timestamptz | |

## Retention policy

| Table | Retention |
|---|---|
| sessions | 30 days then aggregate-only |
| match_logs | 30 days |
| reports | 18 months (legal/abuse window), then anonymized |
| moderation_actions | 5 years |
| bans | indefinite |
| reputation_events | 90 days, then aggregated to user.reputation_score |
| users (deleted) | 30-day soft-delete grace, then hard-delete cascade |

## Hot-path queries (must be fast)

1. **Auth check on socket connect** — `SELECT id, ban_until, is_shadow_banned, premium_until FROM users WHERE id = $1` (cached in Redis 60s)
2. **Active ban lookup** — `WHERE ban_until > now()` partial index
3. **Mod queue** — `SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at`
4. **User-history-on-report-click** — `SELECT * FROM reports WHERE reportee_id = $1 ORDER BY created_at DESC LIMIT 50`

All hot reads should complete in < 5ms with proper indexing on the test dataset.
