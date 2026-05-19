// API client extension: admin-only calls.
import { getToken } from "./api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`admin ${res.status}`);
  return (await res.json()) as T;
}

export interface AdminMetrics {
  pendingReports: number;
  last24Reports: number;
  banned24: number;
  shadow24: number;
  totalUsers: number;
  premiumUsers: number;
  queueDepth: { video: number; audio: number; text: number };
  activeRooms: number;
}

export interface AdminReportRow {
  id: string;
  category: string;
  status: string;
  createdAt: string;
  reporter: { id: string; reputationScore: number };
  reportee: {
    id: string;
    reputationScore: number;
    banUntil: string | null;
    isShadowBanned: boolean;
    ipCountry: string | null;
  };
  session: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    modality: string;
    matchedVia: string;
  };
}

export const adminApi = {
  metrics: () => adminFetch<AdminMetrics>("/admin/metrics"),
  reports: (status: "pending" | "actioned" | "dismissed" = "pending") =>
    adminFetch<{ items: AdminReportRow[]; nextCursor: string | null }>(
      `/admin/reports?status=${status}&limit=50`,
    ),
  action: (id: string, action: string, notes?: string) =>
    adminFetch<{ ok: true }>(`/admin/reports/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    }),
  user: (id: string) => adminFetch<unknown>(`/admin/users/${id}`),
  liveSessions: () => adminFetch<{ sessions: unknown[] }>("/admin/sessions/live"),
  ban: (id: string, duration: "24h" | "7d" | "perm", reason: string) =>
    adminFetch<{ ok: true }>(`/admin/users/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ duration, reason }),
    }),
};
