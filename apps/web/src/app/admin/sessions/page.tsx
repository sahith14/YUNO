"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface SessionRow {
  id: string;
  startedAt: string;
  modality: string;
  matchedVia: string;
  userA: { id: string; ipCountry: string | null; reputationScore: number };
  userB: { id: string; ipCountry: string | null; reputationScore: number };
}

export default function LiveSessions() {
  const [items, setItems] = useState<SessionRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = (await adminApi.liveSessions()) as { sessions: SessionRow[] };
        if (!cancelled) setItems(res.sessions);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const t = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Live sessions</h1>
      <p className="mb-4 text-sm text-cream-100/60">
        {items.length} active conversation{items.length === 1 ? "" : "s"}.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((s) => {
          const ageSec = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
          return (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-cream-100/60">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
                  {s.modality.toUpperCase()} · {s.matchedVia}
                </div>
                <div className="font-mono text-xs text-cream-100/50">{ageSec}s</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[s.userA, s.userB].map((u, i) => (
                  <div key={u.id} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-cream-100/40">User {i === 0 ? "A" : "B"}</div>
                    <div className="mt-1 font-mono text-cream-100/80">{u.id.slice(0, 8)}…</div>
                    <div className="mt-2 flex items-center gap-2 text-cream-100/60">
                      {u.ipCountry && <span>🌍 {u.ipCountry}</span>}
                      <span>· rep {u.reputationScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
