// Shared TypeScript types used by both server and client.

export type Modality = "video" | "audio" | "text";

export type ReportCategory =
  | "nsfw"
  | "minor"
  | "harassment"
  | "violence"
  | "scam"
  | "other";

export type UserKind = "guest" | "user" | "admin";

export type VerifiedLabel = "female" | "male" | "non-binary";

/** Self-declared gender, set at signup. NOT identity-verified. */
export type SelfGender = "female" | "male" | "prefer_not_to_say";

/** What a free user with an active gender filter has remaining before auto-skip. */
export const FREE_FILTER_SECONDS = 18;

export type ReputationBucket = "good" | "neutral" | "low";

export interface JwtClaims {
  sub: string;
  kind: UserKind;
  premium: boolean;
  verified: boolean;
  jti?: string;
  iat: number;
  exp: number;
}

export interface MeResponse {
  userId: string;
  displayHandle: string | null;
  kind: UserKind;
  premium: boolean;
  verified: boolean;
  verifiedLabel: VerifiedLabel | null;
  selfGender: SelfGender | null;
  reputationBucket: ReputationBucket;
  interests: string[];
  shadowBanned: boolean;
  premiumUntil: string | null;
}

export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface IceCredentialsResponse {
  iceServers: IceServerConfig[];
  ttlSeconds: number;
}

export interface IceRegion {
  code: string;
  host: string;
}

export interface QueueFilters {
  gender?: "female" | "male" | "any";
  countries?: string[];
  verifiedOnly?: boolean;
}

export interface MatchPeerInfo {
  userId: string;
  country?: string;
  verifiedLabel?: VerifiedLabel;
  verified: boolean;
  interests: string[];
}

export interface InterestDef {
  slug: string;
  label: string;
  category: string;
}

export interface ApiError {
  error: { code: string; message: string; banUntil?: string };
}
