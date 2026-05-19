"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type AdminReportRow } from "@/lib/admin-api";

const ACTIONS: Array<{ k: string; label: string; tone: "ok" | "warn" | "danger" }> = [
  { k: "warn", label: "Warn", tone: "ok" },
  { k: "shadow_ban_24h", label: "Shadow 24h", tone: "warn" },
  { k: "ban_7d", label: "Ban 7d", tone: "warn" },
  { k: "ban_perm", label: "Permaban", tone: "danger" },
  { k: "dismiss", label: "Dismiss", tone: "ok" },
];

export default function ReportsQueue() {
  const [items, setItems] = useState<AdminReportRow[]>([]);
  const [tab, setTab] = useState<"pending" | "actioned" | "dismissed">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.reports(tab);
      setItems(res.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [tab]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Reports</h1>
      <div className="mb-4 flex gap-2">
        {(["pending", "actioned", "dismissed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
              tab === t ? "border-accent-500/60 bg-accent-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/30"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 text-accent-400">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-cream-100/50">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Reportee</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-4 py-3 text-cream-100/70">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <CategoryPill k={r.category} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <div>{r.reportee.id.slice(0, 8)}…</div>
                  <div className="mt-1 text-cream-100/50">
                    rep {r.reportee.reputationScore} {r.reportee.ipCountry ? `· ${r.reportee.ipCountry}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.reporter.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-cream-100/60">
                  {r.session.modality} · {r.session.matchedVia}
                </td>
                <td className="px-4 py-3">
                  {tab === "pending" ? (
                    <div className="flex flex-wrap gap-1">
                      {ACTIONS.map((a) => (
                        <button
                          key={a.k}
                          disabled={busyId === r.id}
                          onClick={async () => {
                            setBusyId(r.id);
                            try {
                              await adminApi.action(r.id, a.k);
                              await load();
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            a.tone === "danger"
                              ? "bg-accent-500/15 text-accent-400 hover:bg-accent-500/25"
                              : a.tone === "warn"
                                ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                                : "bg-white/5 text-cream-100/70 hover:bg-white/10"
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-cream-100/50">—</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-cream-100/40">
                  Nothing here. Quiet hour. ☕
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryPill({ k }: { k: string }) {
  const tone =
    k === "minor" ? "danger" : k === "nsfw" || k === "violence" ? "warn" : "neutral";
  const cls =
    tone === "danger"
      ? "bg-accent-500/20 text-accent-400"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-white/5 text-cream-100/70";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{k}</span>;
}
