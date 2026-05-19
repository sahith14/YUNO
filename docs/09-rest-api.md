# YUNO — REST API

Base URL: `${API_PUBLIC_URL}` (default `http://localhost:4000`)

All responses are JSON. Errors follow a uniform envelope:

```json
{ "error": { "code": "INVALID_INPUT", "message": "interests must be an array" } }
```

Authenticated endpoints require `Authorization: Bearer <jwt>`.

## Conventions
- Times are ISO 8601 UTC strings.
- Idempotency keys: pass `Idempotency-Key: <uuid>` on POSTs that retry; cached for 60s.
- Rate limits per IP + per user; standard 429 with `Retry-After`.

## JWT shape
```json
{
  "sub": "<userId>",
  "kind": "guest" | "user" | "admin",
  "premium": true,
  "verified": true,
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

## Auth

### `POST /auth/guest`
Create a guest identity. No body required.
**Response 200**
```json
{ "userId": "uuid", "token": "eyJ...", "expiresAt": "...", "kind": "guest" }
```
The server creates a `users` row, sets `device_fingerprint_hash` (from `X-Device-Fingerprint` header if provided), assigns reputation 1000, returns a 24h JWT.

### `POST /auth/upgrade-email`
Convert a guest into an email user. Auth required.
**Body** `{ "email", "password" (≥10 chars) }`
**Response 200** `{ "userId", "token", "kind": "user" }`

### `POST /auth/login`
**Body** `{ "email", "password" }` → returns user JWT.

### `POST /auth/logout`
Invalidates the JWT (added to denylist in Redis with TTL = remaining lifetime).

### `GET /me`
Returns the current user's public-safe profile.
```json
{
  "userId": "uuid", "displayHandle": null, "kind": "guest",
  "premium": false, "verified": false, "verifiedLabel": null,
  "reputationBucket": "good" | "neutral" | "low",
  "interests": ["kpop"], "shadowBanned": false, "premiumUntil": null
}
```

### `DELETE /me`
Hard-delete (GDPR). Cancels Stripe subs, deletes rows, schedules data purge. Returns 202.

---

## ICE / TURN

### `POST /ice/credentials`
Returns short-lived ICE server config. Authenticated.
**Body (optional)** `{ "regionHint": "us-east" }`
**Response 200**
```json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302"] },
    {
      "urls": ["turn:turn.yuno.app:3478?transport=udp", "turn:turn.yuno.app:3478?transport=tcp", "turns:turn.yuno.app:5349"],
      "username": "1700090000:userId",
      "credential": "<HMAC-SHA1-base64>"
    }
  ],
  "ttlSeconds": 3600
}
```
Time-based scheme: `username = <unix-expiry>:<userId>`, `credential = base64(HMAC_SHA1(TURN_SHARED_SECRET, username))`.

### `GET /ice/regions`
Public. Returns available Coturn regions and their hostnames.

---

## Interests

### `GET /interests`
Public. Curated dictionary, cached 1h.

### `PUT /me/interests`
Replaces user's interests. **Body** `{ "slugs": ["kpop", "indie-games"] }` (max 1 free, 5 premium).

---

## Reports

### `POST /reports`
**Body**
```json
{
  "sessionId": "uuid",
  "category": "nsfw" | "minor" | "harassment" | "violence" | "scam" | "other",
  "note": "optional ≤500 chars",
  "evidenceFrameBase64": "data:image/jpeg;base64,..."
}
```
The optional `evidenceFrameBase64` is a thumbnail captured from the client's `<video>` element. The API uploads it to S3 (KMS-encrypted, 30-day retention).

On `nsfw` or `minor` reports, the API:
1. Increments the reportee's pending-action counter
2. If ≥ `MODERATION_REPORT_THRESHOLD`, instant shadow-ban 24h
3. Pushes the report to the queue with elevated priority

**Response 200** `{ "reportId": "uuid" }`

### `GET /reports/mine`
Lists reports the current user has filed (transparency).

---

## Premium / Subscriptions

### `POST /billing/checkout`
**Body** `{ "product": "premium" | "verified" | "bundle", "interval": "month" | "year" }`
**Response** `{ "checkoutUrl": "..." }`

### `POST /billing/portal`
Returns a Stripe customer portal URL.

### `POST /billing/webhook`
Stripe webhook target. Signature verified.
Events: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed`.

### `GET /billing/status`
Returns current subscription state.

---

## Verification

### `POST /verification/start`
Creates a Stripe Identity session. Returns `{ "url", "sessionId" }`.

### `POST /verification/webhook`
Stripe Identity webhook. On `identity.verification_session.verified`:
1. Insert into `verifications`
2. Set `users.verified_at = now()`, `verified_label`, `age_year`
3. Activate the Verified subscription if pending

---

## Reconnect (Premium)

### `POST /reconnect/issue`
Issues a one-time token (both users must opt in).
**Body** `{ "sessionId": "uuid" }` → `{ "token", "expiresAt" }`

### `POST /reconnect/redeem`
**Body** `{ "token" }` → returns target user info or 410 if expired.

---

## Admin (`kind = "admin"`)

In production also gated by IP allowlist.

### `GET /admin/reports?status=pending&limit=50&cursor=`
Paged moderation queue.

### `POST /admin/reports/:id/action`
**Body** `{ "action": "warn" | "shadow_ban_24h" | "ban_7d" | "ban_perm" | "dismiss", "notes": "..." }`

### `GET /admin/users/:id`
Full user info + ban history + recent sessions + reports against.

### `POST /admin/users/:id/ban`
**Body** `{ "duration": "24h" | "7d" | "perm", "reason": "...", "scopeIp": false }`

### `GET /admin/sessions/live`
Currently-active sessions (SSE stream).

### `GET /admin/metrics`
KPI summary — TTQC, queue depth, report rate, active mods.

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_INPUT` | 400 | Validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Auth ok, not allowed |
| `NOT_FOUND` | 404 | |
| `RATE_LIMITED` | 429 | Too many requests |
| `BANNED` | 403 | User is banned (response includes `banUntil`) |
| `INTERNAL` | 500 | |

## Headers we always set
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`
- `Content-Security-Policy: default-src 'self'; connect-src <api,signaling,stripe>`
