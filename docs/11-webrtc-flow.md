# YUNO — WebRTC Flow

## What WebRTC actually is, in our context

Two browsers establish a direct audio/video stream between each other, with the server only helping them *find* each other and *negotiate* parameters. The server never sees the media (except in the worst case via TURN relay, where it only blindly forwards encrypted bytes).

Three pieces:
1. **Signaling** — the dance of "hi I'd like to talk", "ok here's how I can hear you", "here's how I can be reached". This goes through our Socket.IO server.
2. **STUN** — "what's my public IP?" — small request to a STUN server, response is a candidate the peer can try.
3. **TURN** — "if you can't reach me directly, send the bytes through this relay and I'll pick them up". Last resort, costs us money.

## The full happy-path sequence

```
USER A (initiator)                  SIGNALING                     USER B (peer)
─────────────────                   ─────────                     ──────────────

connect(socket)               ─────▶
                                                                  ◀───── connect(socket)

queue:join                    ─────▶
                                                                  ◀───── queue:join

                                  matchmaker pairs A & B
                                  creates room "room:abc"
                                  sets initiator=A

◀───── match:found {init=true, peer, iceServers}
                                                                  match:found {init=false, ...} ─────▶

(A creates RTCPeerConnection)                                     (B creates RTCPeerConnection)
(A adds local tracks)                                             (B adds local tracks)
(A: pc.createOffer)                                               (B: just waits)
(A: pc.setLocalDescription(offer))

signal:offer {sdp}            ─────▶ forwards    ─────▶
                                                                  (B: pc.setRemoteDescription(offer))
                                                                  (B: pc.createAnswer)
                                                                  (B: pc.setLocalDescription(answer))
                                                            ◀───── signal:answer {sdp}
◀───── forwards    ◀─────
(A: pc.setRemoteDescription(answer))

(both sides start gathering ICE candidates as they trickle in)

signal:ice-candidate {cand}   ─────▶ forwards    ─────▶ (B adds candidate)
                                              ◀───── forwards ◀───── signal:ice-candidate {cand}

(ICE checks happen between candidate pairs)
(eventually pc.iceConnectionState = "connected" or "completed")

room:ready                    ─────▶
                                                                  room:ready ─────▶
                              session timer starts; tracks flow peer-to-peer
                              video/audio bytes go DIRECTLY between A and B,
                              NEVER through our signaling server
```

## Client implementation (in `apps/web/src/lib/webrtc.ts`)

```ts
const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "all" });

// 1. Add local tracks
const localStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: modality === "video" ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 30 } } : false
});
localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

// 2. Hook up remote stream
pc.ontrack = (e) => { remoteVideo.srcObject = e.streams[0]; };

// 3. Trickle ICE
pc.onicecandidate = (e) => {
  if (e.candidate) socket.emit("signal:ice-candidate", { roomId, candidate: e.candidate.toJSON() });
};

// 4. Watch state for UI
pc.oniceconnectionstatechange = () => { /* update UI: connecting → connected */ };

// 5. If initiator: createOffer + send
if (isInitiator) {
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
  await pc.setLocalDescription(offer);
  socket.emit("signal:offer", { roomId, sdp: offer.sdp });
}

// 6. On signal:offer (peer):
socket.on("signal:offer", async ({ sdp }) => {
  await pc.setRemoteDescription({ type: "offer", sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("signal:answer", { roomId, sdp: answer.sdp });
});

// 7. On signal:answer (initiator):
socket.on("signal:answer", async ({ sdp }) => {
  await pc.setRemoteDescription({ type: "answer", sdp });
});

// 8. On signal:ice-candidate (both):
socket.on("signal:ice-candidate", async ({ candidate }) => {
  await pc.addIceCandidate(candidate);
});

// 9. Cleanup on skip / leave
socket.on("room:ended", () => {
  pc.close();
  localStream.getTracks().forEach(t => t.stop());
});
```

## ICE candidate types and what they mean

| Type | Means | We pay? |
|---|---|---|
| `host` | Local IP — only useful if peer is on same LAN | No |
| `srflx` (server reflexive) | Public IP discovered via STUN | No |
| `prflx` (peer reflexive) | Discovered during ICE check | No |
| `relay` | Goes through TURN | **Yes** |

We always include all candidate types and let ICE pick the best path. The browser tries pairs in order of priority; relay is last.

## TURN credential issuance

TURN credentials are short-lived (1 hour by default). The API mints them via:

```
username = "<unix-expiry>:<userId>"
credential = base64(HMAC_SHA1(TURN_SHARED_SECRET, username))
```

Coturn is configured with `use-auth-secret` and `static-auth-secret = TURN_SHARED_SECRET`. It validates by computing the same HMAC, so credentials are stateless — Coturn doesn't talk to our DB.

The client requests fresh credentials each time it joins the queue (via the signaling `match:found` payload, OR via `POST /ice/credentials` proactively).

## The trickle problem

A naïve implementation gathers ALL ICE candidates *before* sending an offer. This adds 1-3s of perceived latency. We use **trickle ICE**: send the offer immediately with `iceCandidates: []`, then stream candidates as they arrive. The peer adds them as they come.

Trickle is the default in modern browsers; we just need to make sure our signaling server forwards `signal:ice-candidate` events promptly without batching.

## Reconnect during a session

If a user's network blips for < 8 seconds, ICE will recover automatically (`iceconnectionstate: disconnected → checking → connected`). The UI shows a subtle "reconnecting" hint but does not tear down the call.

If the WebSocket itself disconnects, Socket.IO auto-reconnects with the same JWT, but the room is considered ended. Both users return to the queue. This is intentional — you can't trust a session whose signaling channel died.

## Codecs

We accept the browser's defaults but apply minor SDP munging:
- **Audio:** Opus, 32 kbps target
- **Video:** VP8 preferred (best compatibility); H.264 fallback for Safari iOS

We do NOT prefer VP9 or AV1. They reduce bandwidth but require more CPU, which causes frame drops on cheaper devices and a worse perceived experience.

## Bitrate management

We set `RTCRtpSender.setParameters` with `maxBitrate: 800 kbps` for video, `64 kbps` for audio. Premium HD uses 1500 kbps. We never auto-upgrade — we leave bandwidth on the table to keep TURN costs predictable.

## Voice-only mode

When the user picks audio mode:
- `getUserMedia({ video: false, audio: true })`
- offer is created without `m=video`
- TURN bandwidth drops by ~95% per session
- We pitch this as a "low data" mode in mobile UI

This is one of our most important cost-control levers (see `06-infrastructure-cost.md`).

## Failure modes & UX

| Failure | What user sees | What we do |
|---|---|---|
| Camera denied | "Allow camera to start chatting" + retry button | Don't enter queue until granted |
| ICE never connects (rare, restrictive networks) | "Couldn't connect to <peer>. Trying someone new." after 12s timeout | Auto-skip, re-queue |
| Mid-call ICE drop | "Reconnecting..." overlay | Wait 8s, then `room:skip` |
| WS disconnects | "Reconnecting..." | Reopen socket; if room was active, re-queue |
| Peer skips | Smooth fade transition + "Looking for someone new..." | Re-queue automatically |
