# YUNO — WebSocket Event Contract

The signaling server uses Socket.IO over WebSocket. Both client and server share the typed event map in [`packages/shared/src/events.ts`](../packages/shared/src/events.ts).

Connection URL: `${SIGNALING_PUBLIC_URL}` (default `ws://localhost:4001`).

## Connection / handshake

The client connects with a JWT in `auth.token`:

```ts
const socket = io(SIGNALING_URL, {
  transports: ["websocket"],
  auth: { token: jwt, fingerprint: deviceFingerprint }
});
```

The server validates the JWT in a middleware, attaches `socket.data.user`, and rejects with `connect_error` if invalid, banned, or shadow-banned (shadow bans connect successfully but never get matched).

## Event direction notation
- `C → S`  client emits, server receives
- `S → C`  server emits, client receives
- `C ↔ S`  both directions (acks)

## Connection lifecycle

| Phase | Events |
|---|---|
| Connect | (handshake) → `S → C: connected` |
| Lobby | `C → S: queue:join` → `S → C: queue:waiting` → `S → C: match:found` |
| In room | `C ↔ S: signal:offer / answer / ice-candidate` → `S → C: room:ready` |
| Skip | `C → S: room:skip` → `S → C: room:ended` → loop back to queue |
| Report | `C → S: report:flag` (with optional `S → C: room:ended`) |
| Disconnect | (transport close) → server cleans up presence, ends room |

---

## C → S

### `queue:join`
Client requests entry into the matchmaking queue.
```ts
{
  modality: "video" | "audio" | "text",
  interests: string[],          // slugs, max 5 (1 for free)
  filters?: {                   // premium only; ignored for free users
    gender?: "female" | "male" | "non-binary" | "any",
    countries?: string[],       // ISO-2
    verifiedOnly?: boolean
  },
  region: string,               // client-detected region for proximity matching
  premium: boolean,             // claim from JWT
  verified: boolean             // claim from JWT
}
```
Ack: `{ ok: true, queuePosition: number, etaSeconds?: number }` or `{ ok: false, error: string }`.

### `queue:leave`
Cancel queue.
Ack: `{ ok: true }`.

### `signal:offer`
Forward an SDP offer to the matched peer.
```ts
{ roomId: string, sdp: string }
```

### `signal:answer`
Forward an SDP answer.
```ts
{ roomId: string, sdp: string }
```

### `signal:ice-candidate`
Forward an ICE candidate.
```ts
{ roomId: string, candidate: RTCIceCandidateInit }
```

### `room:ready`
Client confirms the peer connection has reached `connected` state. Server uses this to start session-duration metering.
```ts
{ roomId: string }
```

### `room:skip`
End the current room, return to queue.
```ts
{ roomId: string, reason?: "skip" | "issue" }
```
Ack: `{ ok: true }`.

### `room:leave`
End the current room, do NOT re-queue (user is leaving).
```ts
{ roomId: string }
```

### `chat:message`
Text message during a session (used in text mode and as an in-call sidebar).
```ts
{ roomId: string, text: string /* ≤ 500 */ }
```
Ack: `{ ok: true, ts: number }`.

### `chat:typing`
Throttled typing indicator.
```ts
{ roomId: string, typing: boolean }
```

### `report:flag`
Report current peer mid-call (does not end the call, but routes priority moderation).
```ts
{
  roomId: string,
  category: "nsfw" | "minor" | "harassment" | "violence" | "scam" | "other",
  evidenceFrameBase64?: string
}
```
Ack: `{ ok: true, reportId: string }`. The signaling server forwards to the API which persists the report.

### `presence:heartbeat`
Optional client → server ping every 25s to keep idle sockets warm. Socket.IO has its own pings, this is for our presence Hash refresh.

---

## S → C

### `connected`
Sent immediately after handshake.
```ts
{
  userId: string,
  rateLimit: { skipsPerMin: number, reportsPerHour: number },
  iceTtlSeconds: number      // hint about TURN cred lifetime
}
```

### `queue:waiting`
Periodic update while in queue.
```ts
{ position: number, etaSeconds: number, queueDepth: number }
```

### `match:found`
A pair has been formed. Both peers receive this with their assigned role.
```ts
{
  roomId: string,
  initiator: boolean,         // exactly one peer is initiator (creates the offer)
  peer: {
    userId: string,           // opaque to UI; used for report wiring
    country?: string,         // ISO-2 if available
    verifiedLabel?: "female" | "male" | "non-binary",
    verified: boolean,
    interests: string[]       // intersection of declared interests, for "you both like X" UI
  },
  matchedVia: string,         // "random" | "interest:kpop" | "premium_filter"
  iceServers: RTCIceServer[]  // freshly minted, peer-specific
}
```

### `signal:offer`
Forwarded from peer.
```ts
{ roomId: string, sdp: string }
```

### `signal:answer`
Forwarded from peer.
```ts
{ roomId: string, sdp: string }
```

### `signal:ice-candidate`
Forwarded from peer.
```ts
{ roomId: string, candidate: RTCIceCandidateInit }
```

### `room:ended`
Server tells client the room is over.
```ts
{
  roomId: string,
  reason: "peer_skip" | "peer_left" | "you_skip" | "moderator" | "system" | "report",
  duration: number  // seconds
}
```

### `chat:message`
Text from peer.
```ts
{ roomId: string, from: "peer", text: string, ts: number }
```

### `chat:typing`
Typing indicator from peer.
```ts
{ roomId: string, typing: boolean }
```

### `error`
Generic error event (most errors are returned as ack `{ ok: false, error }`; this is for unsolicited errors).
```ts
{ code: "BANNED" | "SHADOW_BAN" | "RATE_LIMITED" | "INTERNAL", message: string, until?: string }
```

### `system:notice`
Out-of-band server notice (e.g., "we're updating the service"). Rare.
```ts
{ severity: "info" | "warning", message: string }
```

---

## Server-side rules

### Authorization
- Sockets without a valid JWT are rejected at handshake.
- Banned users (`ban_until > now`) are rejected with `error: { code: "BANNED" }`.
- Shadow-banned users connect but are never matched. They see a fake-feeling "queue:waiting" forever (with subtle randomization to look real).

### Rate limits (enforced at signaling, backed by Redis counters)
- 30 skips per minute per user
- 1 report per active room
- 60 chat messages per minute per user
- 1 reconnect attempt per 30 seconds

### Forwarding rules
- `signal:offer`, `signal:answer`, `signal:ice-candidate` are only forwarded if both `roomId` and the sender are members of that room. Unauthorized signaling is dropped silently.

### Timeouts
- A user who joins the queue but never sends `room:ready` after match within 20s is removed; the peer is re-queued and a counter is incremented (excessive failures lower reputation).
- A room with no `room:ready` from either peer within 25s is auto-closed.

### Cleanup
- On socket disconnect: delete from queue, end any active room with reason `peer_left`, decrement presence.
- On instance shutdown (SIGTERM): graceful 10s drain, send `system:notice`, close sockets.

---

## Error semantics

Every C → S event supports an ack callback. The shape is always `{ ok: boolean, ... }`. If the server does not respond within 5s, the client should retry once, then degrade gracefully (most cases: show a "reconnecting" toast).

---

## Why an explicit contract matters here

WebRTC signaling has surprisingly few moving parts but they all have to be exactly right. We pin the event names, payload shapes, and direction in `packages/shared/src/events.ts`, then both client and server import the same types. A typo cannot ship — TypeScript catches it at compile time on both sides.
