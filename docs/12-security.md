# YUNO — Security & Trust

> The single most important document in this repo. Random video chat that is not aggressively safe is a death sentence — for users and for the business.

## 1. Threat model

We assume the following adversaries exist on day one:

| Adversary | Goal | Severity |
|---|---|---|
| **Sexual predators / CSAM producers** | Find and exploit minors | Existential |
| **Exhibitionists / NSFW spammers** | Expose unwanted content to other users | Severe |
| **Harassers / bigots** | Verbal abuse, hate speech | High |
| **Catfish / scammers** | Romance scam, sextortion | High |
| **Bot operators** | Inflate user counts, scrape, advertise | Medium |
| **Brand attackers / trolls** | Coordinated reporting to silence users | Medium |
| **Nation-state actors** | Harvest videos for face recognition, surveillance | Low (but increasing) |

Every system below is justified by which adversary it counters.

## 2. The defense layers (in order of how a session encounters them)

### Layer 1 — Pre-entry (before a user can even queue)
- **Cloudflare Turnstile** at the start of every session attempt. Defeats most casual bots.
- **Age gate.** "I am 18 or older" checkbox + IP-country aware. Stored on the user record.
- **Device fingerprint hash.** Canvas + WebGL + UA + timezone + audio context fingerprint, hashed. Used to detect ban-evasion.
- **IP reputation check.** Cross-reference IP against MaxMind + abuse lists. Datacenter IPs and known TOR exits are blocked from chat (reading the marketing site is fine).
- **JWT must be present.** A guest account is created on `POST /auth/guest`. We can revoke whole IP ranges or fingerprints by adding them to the deny list.

### Layer 2 — In-queue (server-side filtering)
- **Active ban check.** Hot-path Redis lookup against `bans:active` set; sub-1ms.
- **Shadow-ban quarantine.** Shadow-banned users never get matched with real users. They see a fake "looking for stranger…" forever. Their session is logged for forensics.
- **Reputation gating.** Users below a reputation threshold (e.g., < 200) only get matched with each other. Most never even notice they're in the bad-pool.
- **Rate limits.** 30 skips/min, 1 report/active-room, 60 chat msgs/min.

### Layer 3 — In-call (client + server)
- **NSFW frame classifier.** Client samples a video frame every 15 seconds, downscales to 256×256, runs through a local ONNX-quantized CLIP-based NSFW classifier. If nudity is detected with high confidence:
  - First strike: **client-side** auto-skip + 60s cooldown
  - Second strike same session: server gets notified, instant 7-day ban
- **Reporter UX.** A single "🚩 Report" button at any time. Two taps to file. Always visible, never hidden.
- **Mid-call evidence capture.** When a user files a report, the client captures the last 5 frames (one per second) of the peer's video and uploads them with the report. Used by mod team to verify the report.
- **Server-side spot-check.** A randomized 1% of sessions get a server-requested frame upload (rotating among Coturn-relayed sessions for cost). Caught violations score reputation aggressively.

### Layer 4 — Post-call (audit + escalation)
- **Reports go to mod queue.** Pending reports are reviewed by a human within < 5 minutes (target).
- **Mod dashboard** allows: warn, shadow-ban 24h, ban 7d, ban perm, dismiss. Every action is logged in `moderation_actions` with reviewer ID.
- **Escalation paths.** CSAM reports go directly to NCMEC (US users) and InHope (international). Hash extracted via PhotoDNA before deletion.

## 3. The reputation system

```
new user:                1000
30-min good session:     +5
60-min good session:     +10
report received & dismissed: +0  (no penalty for false reports against you)
report received & actioned:  -100
report filed (you):
  - if actioned:            +5  (rewarded for valid reports)
  - if dismissed:            -10  (penalty for false reports)
3 dismissed reports in 24h:  -50  (clear pattern)
ban issued:                  -300 (sticks even after ban expires)
identity verification:       +200 (one-time floor raise)
30-day daily activity:       +20 (tenure bonus)

clamped to [0, 2000]
```

The score is **never shown to users**. It only influences:
- Matching priority (higher rep = matched with higher rep)
- Quarantine threshold (< 200 = bad-pool)
- Auto-action thresholds (lower rep = lower threshold to auto-shadow-ban)

We deliberately don't gamify it. The moment users see scores, they game them.

## 4. Anti-bot / anti-farm

- **Behavioral entropy:** humans have variable inter-event timing (typing, mouse movement, click patterns). Pure bots are too regular. We compute a simple entropy score on the client and ship it as a JWT claim.
- **CAPTCHA on suspicion:** if entropy is low or velocity is high (e.g., 50 sessions/hour), we issue a Turnstile challenge mid-session.
- **Device fingerprint clustering:** if 20 accounts share the same fingerprint, we ban the fingerprint.
- **IP rate caps:** more than 5 new accounts per hour from the same IP triggers a captcha + cooldown.

## 5. Anti-evasion

The classic ban-evasion vector is "create a new account from the same browser". We counter:
- Hash device fingerprint, store on every user
- On ban: fingerprint goes onto the deny list
- On signup: check fingerprint against deny list
- IP CIDR bans for severe abuse rings (manual moderator action)
- Stripe Identity hash matching: same ID document cannot be used to verify a second account

VPN circumvention is harder. Realistic stance: we aren't going to win against a determined attacker with a fresh device, fresh browser profile, and a residential proxy. We win on **friction** — making evasion expensive enough that 95% of bad actors don't bother.

## 6. Privacy posture

### What we store
| Data | Storage | Retention |
|---|---|---|
| Email (optional) | Postgres, hashed for indexing | until account deletion |
| Password (optional) | Postgres, argon2id | until account deletion |
| Device fingerprint hash | Postgres | until account deletion |
| Last known IP country | Postgres (country only, never full IP) | until account deletion |
| Session metadata | Postgres | 30 days then aggregated |
| Conversation content | NEVER STORED | — |
| Video / audio stream | NEVER STORED (peer-to-peer or TURN-relayed encrypted) | — |
| Report evidence frames | S3, KMS-encrypted | 30 days, longer if escalated |
| Stripe Identity ID data | Stripe (we never see it) | per Stripe policy |

### What we never do
- Never record a conversation without explicit consent from BOTH users
- Never sell or share user data
- Never train AI on conversation content
- Never use user video/audio for any purpose other than the live call
- Never share data with third parties except: Stripe (payments), Cloudflare (anti-DDoS), legal requests with valid warrant

## 7. Compliance checklist

| Regulation | Requirement | Implementation |
|---|---|---|
| **GDPR** (EU) | Right to access, erase, port | DELETE /me, GET /me/export, hard cascade deletes |
| **GDPR** | Lawful basis | Legitimate interest (provide service), explicit consent for cookies |
| **CCPA** (CA) | Do Not Sell | We don't sell. Banner + opt-out endpoint. |
| **DSA** (EU) | Notice & action, transparency reports | Report endpoint, quarterly transparency report |
| **COPPA** (US) | No under-13 | 18+ age gate; CSAM detection escalation |
| **India IT Rules 2021** | Grievance officer, content moderation timelines | Listed contact, < 24h response SLA |
| **NCMEC** (US) | Mandatory CSAM reporting | Direct integration, automated upload |
| **PhotoDNA** | Hash matching against known CSAM | Microsoft API on suspicious frames |

## 8. Operational moderation

- **Mod team structure:** 8 full-time moderators in Manila + Lisbon for round-the-clock coverage. Plus a Trust & Safety lead.
- **SLAs:**
  - CSAM / minor reports: < 60 seconds to action
  - NSFW reports: < 5 minutes
  - Other: < 30 minutes
- **Mod dashboard latency:** sub-500ms queue refresh, evidence loaded in < 1s.
- **Mod calibration:** weekly review of 5% of dismissed reports by a senior mod. Disagreement rate > 10% → retraining.
- **Mental health:** mods rotate off NSFW duty every 2 hours, max 4 hours/day on high-trauma content. Mandatory counseling access.
- **Wellbeing budget:** $150/mod/month for therapy / wellness. Non-negotiable.

## 9. CSAM specifically

This is the only thing in this document that could end the company. Treat accordingly.

1. **Pre-emption:** age gate, IP geo, and "minor"-related interest tags are blacklisted.
2. **Detection:** PhotoDNA hashing on every reported frame; NSFW classifier flags young-appearance with elevated scrutiny.
3. **Response:**
   - Suspend account immediately
   - Lock IP CIDR for 7 days (manual review)
   - Generate evidence pack (frames + metadata + IP + fingerprint)
   - Auto-file NCMEC CyberTipline report within 5 minutes
   - Preserve evidence per US 18 USC § 2258A (90 days minimum)
4. **Reporting:** quarterly NCMEC volume in transparency report.
5. **Public stance:** zero tolerance, prominent in marketing copy, prominent in onboarding.

## 10. Incident response

- **On-call rotation:** 1 engineer + 1 trust & safety lead, 24/7
- **Severity definitions:**
  - SEV1: CSAM detected and not actioned within 5 min, or service down
  - SEV2: NSFW spam wave, mod queue > 100 backlog
  - SEV3: degraded matching latency, partial outage
- **Runbooks:** in `docs/runbooks/` (to be added) — emergency ban scripts, queue drain, fingerprint bulk-ban, full-site degraded mode (text-only fallback)

## 11. Headers & cryptography defaults

- TLS 1.3 only (Cloudflare-terminated)
- HSTS preloaded
- All passwords: argon2id, m=64MB, t=3, p=4
- All JWTs: HS256 with 64-byte secret, rotation quarterly
- All TURN creds: HMAC-SHA1, 1h TTL
- All Stripe webhooks: signature verified against per-environment secret
- All admin endpoints: gated by IP allowlist + JWT role + audit logged
