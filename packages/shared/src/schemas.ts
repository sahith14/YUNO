// Zod schemas for validation. Used by both client (form validation) and server
// (request body validation).

import { z } from "zod";
import {
  CHAT_MESSAGE_MAX_CHARS,
  DISPLAY_HANDLE_MAX_CHARS,
  INTERESTS_MAX_PREMIUM,
  REPORT_NOTE_MAX_CHARS,
} from "./constants.js";

const slugRe = /^[a-z0-9][a-z0-9-]{1,30}$/;
const isoCountry = z.string().regex(/^[A-Z]{2}$/, "ISO-2 country code");

// ----- Auth -----

export const RegisterEmailBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

// ----- Interests -----

export const SetInterestsBody = z.object({
  slugs: z
    .array(z.string().regex(slugRe))
    .min(0)
    .max(INTERESTS_MAX_PREMIUM),
});

// ----- ICE -----

export const IceCredentialsBody = z
  .object({
    regionHint: z.string().max(20).optional(),
  })
  .strict();

// ----- Reports -----

export const ReportCategoryEnum = z.enum([
  "nsfw",
  "minor",
  "harassment",
  "violence",
  "scam",
  "other",
]);

export const ReportBody = z.object({
  sessionId: z.string().uuid(),
  category: ReportCategoryEnum,
  note: z.string().max(REPORT_NOTE_MAX_CHARS).optional(),
  // base64 data URL up to ~1MB; we cap on the server before persisting
  evidenceFrameBase64: z.string().max(2_000_000).optional(),
});

// ----- Premium / billing -----

export const CheckoutBody = z.object({
  product: z.enum(["premium", "verified", "bundle"]),
  interval: z.enum(["month", "year"]).default("month"),
});

// ----- Reconnect -----

export const ReconnectIssueBody = z.object({
  sessionId: z.string().uuid(),
});

export const ReconnectRedeemBody = z.object({
  token: z.string().min(8).max(200),
});

// ----- Admin -----

export const AdminActionBody = z.object({
  action: z.enum(["warn", "shadow_ban_24h", "ban_7d", "ban_perm", "dismiss"]),
  notes: z.string().max(2000).optional(),
});

export const AdminBanBody = z.object({
  duration: z.enum(["24h", "7d", "perm"]),
  reason: z.string().min(3).max(500),
  scopeIp: z.boolean().default(false),
});

// ----- Profile / settings -----

export const SetGenderBody = z.object({
  selfGender: z.enum(["female", "male", "prefer_not_to_say"]),
});

export const UpdateMeBody = z
  .object({
    displayHandle: z
      .string()
      .min(2)
      .max(DISPLAY_HANDLE_MAX_CHARS)
      .regex(/^[A-Za-z0-9_.-]+$/)
      .optional(),
    locale: z.string().max(10).optional(),
    privacyInvisible: z.boolean().optional(),
    acceptsReconnect: z.boolean().optional(),
    consentAge18: z.boolean().optional(),
  })
  .strict();

// ----- Socket payloads (mirror events.ts but as zod for runtime validation) -----

export const ModalityEnum = z.enum(["video", "audio", "text"]);

export const QueueJoinPayload = z.object({
  modality: ModalityEnum,
  interests: z.array(z.string().regex(slugRe)).max(INTERESTS_MAX_PREMIUM),
  filters: z
    .object({
      gender: z.enum(["female", "male", "any"]).optional(),
      countries: z.array(isoCountry).max(20).optional(),
      verifiedOnly: z.boolean().optional(),
    })
    .optional(),
  region: z.string().max(20),
});

export const ChatMessagePayload = z.object({
  roomId: z.string().uuid(),
  text: z.string().min(1).max(CHAT_MESSAGE_MAX_CHARS),
});

export const SignalSdpPayload = z.object({
  roomId: z.string().uuid(),
  sdp: z.string().min(1).max(20_000),
});

export const SignalIcePayload = z.object({
  roomId: z.string().uuid(),
  candidate: z.object({
    candidate: z.string().max(2000).optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().int().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

export const RoomReadyPayload = z.object({ roomId: z.string().uuid() });
export const RoomSkipPayload = z.object({
  roomId: z.string().uuid(),
  reason: z.enum(["skip", "issue"]).optional(),
});
export const ReportFlagPayload = z.object({
  roomId: z.string().uuid(),
  category: ReportCategoryEnum,
  evidenceFrameBase64: z.string().max(2_000_000).optional(),
});

export type QueueJoinPayloadT = z.infer<typeof QueueJoinPayload>;
export type ReportBodyT = z.infer<typeof ReportBody>;
