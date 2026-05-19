// Tiny REST client for the API. Reads/writes the JWT from localStorage.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "yuno_jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string): void {
  window.localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const json = await res.json();
      detail = json?.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Auth ----

export interface AuthResponse {
  userId: string;
  token: string;
  expiresAt: string;
  kind: "guest" | "user" | "admin";
}

export async function authGuest(fingerprint?: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/auth/guest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(fingerprint ? { "x-device-fingerprint": fingerprint } : {}),
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`auth failed (${res.status})`);
  const data = (await res.json()) as AuthResponse;
  setToken(data.token);
  return data;
}

export interface MeResponse {
  userId: string;
  displayHandle: string | null;
  kind: "guest" | "user" | "admin";
  premium: boolean;
  verified: boolean;
  verifiedLabel: string | null;
  selfGender: "female" | "male" | "prefer_not_to_say" | null;
  reputationBucket: "good" | "neutral" | "low";
  interests: string[];
  shadowBanned: boolean;
  premiumUntil: string | null;
}

export const getMe = () => req<MeResponse>("/me");

export const setGender = (selfGender: "female" | "male" | "prefer_not_to_say") =>
  req<{ ok: true; selfGender: string }>("/me/gender", {
    method: "PATCH",
    body: JSON.stringify({ selfGender }),
  });

export interface InterestDef {
  slug: string;
  label: string;
  category: string;
}

export const getInterests = () => req<{ interests: InterestDef[] }>("/interests");

export const setInterests = (slugs: string[]) =>
  req<{ ok: true; interests: string[] }>("/me/interests", {
    method: "PUT",
    body: JSON.stringify({ slugs }),
  });

export interface IceCredentialsResponse {
  iceServers: RTCIceServer[];
  ttlSeconds: number;
}

export const getIceCredentials = (regionHint?: string) =>
  req<IceCredentialsResponse>("/ice/credentials", {
    method: "POST",
    body: JSON.stringify({ regionHint }),
  });

export const startCheckout = (product: "premium" | "verified" | "bundle") =>
  req<{ checkoutUrl: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ product }),
  });

export const submitReport = (payload: {
  sessionId: string;
  category: string;
  note?: string;
  evidenceFrameBase64?: string;
}) => req<{ reportId: string }>("/reports", { method: "POST", body: JSON.stringify(payload) });
