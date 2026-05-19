"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminMetrics } from "@/lib/admin-api";

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const m = await adminApi.metrics();
        if (!cancelled) setMetrics(m);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    };
    void tick();
    const t = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-accent-500/40 bg-accent-500/10 p-4 text-accent-400">
        {error} — make sure you&apos;re signed in as an admin user.
      </div>
    );
  }

  if (!metrics) return <div className="text-cream-100/50">Loading…</div>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Live operations</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Pending reports" value={metrics.pendingReports} accent={metrics.pendingReports > 50 ? "danger" : "ok"} />
        <Card label="Reports / 24h" value={metrics.last24Reports} />
        <Card label="Active rooms" value={metrics.activeRooms} />
        <Card label="Queued (video)" value={metrics.queueDepth.video} />
        <Card label="Banned / 24h" value={metrics.banned24} />
        <Card label="Shadow-banned" value={metrics.shadow24} />
        <Card label="Premium subs" value={metrics.premiumUsers} />
        <Card label="Total users" value={metrics.totalUsers} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-3 text-sm uppercase tracking-[0.2em] text-cream-100/50">Queue depth</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {(["video", "audio", "text"] as const).map((m) => (
            <div key={m} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-2xl font-semibold">{metrics.queueDepth[m]}</div>
              <div className="text-xs uppercase tracking-wider text-cream-100/50">{m}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "ok" | "danger";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent === "danger"
          ? "border-accent-500/40 bg-accent-500/10"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-cream-100/50">{label}</div>
    </div>
  );
}
