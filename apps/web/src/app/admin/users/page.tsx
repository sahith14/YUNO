"use client";

import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface UserDetail {
  id: string;
  email: string | null;
  reputationScore: number;
  banUntil: string | null;
  isShadowBanned: boolean;
  premiumUntil: string | null;
  verifiedAt: string | null;
  ipCountry: string | null;
  createdAt: string;
  reportsAgainst: Array<{ id: string; category: string; createdAt: string; status: string }>;
  reportsFiled: Array<{ id: string; category: string; createdAt: string; status: string }>;
  bans: Array<{ id: string; reason: string; startsAt: string; endsAt: string | null }>;
}

export default function UserLookup() {
  const [id, setId] = useState("");
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setError(null);
    setUser(null);
    setBusy(true);
    try {
      const u = (await adminApi.user(id.trim())) as UserDetail;
      setUser(u);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ban = async (duration: "24h" | "7d" | "perm") => {
    if (!user) return;
    const reason = window.prompt(`Reason for ${duration} ban?`);
    if (!reason) return;
    setBusy(true);
    try {
      await adminApi.ban(user.id, duration, reason);
      await lookup();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">User lookup</h1>
      <div className="mb-6 flex gap-3">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="user UUID"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-sm focus:border-glow-500/60 focus:outline-none"
        />
        <button
          onClick={lookup}
          disabled={!id || busy}
          className="rounded-xl bg-cream-50 px-5 py-2.5 font-medium text-ink-950 disabled:opacity-50"
        >
          Look up
        </button>
      </div>

      {error && <div className="mb-4 text-accent-400">{error}</div>}

      {user && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Reputation" value={user.reputationScore} />
              <Field label="Country" value={user.ipCountry ?? "—"} />
              <Field
                label="Premium"
                value={user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString() : "no"}
              />
              <Field label="Verified" value={user.verifiedAt ? "yes" : "no"} />
              <Field label="Email" value={user.email ?? "guest"} />
              <Field label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
              <Field
                label="Banned"
                value={
                  user.banUntil && new Date(user.banUntil) > new Date()
                    ? new Date(user.banUntil).toLocaleString()
                    : "no"
                }
              />
              <Field label="Shadow" value={user.isShadowBanned ? "yes" : "no"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => ban("24h")}
                className="rounded-full bg-amber-500/15 px-4 py-1.5 text-sm text-amber-300 hover:bg-amber-500/25"
              >
                Ban 24h
              </button>
              <button
                onClick={() => ban("7d")}
                className="rounded-full bg-amber-500/15 px-4 py-1.5 text-sm text-amber-300 hover:bg-amber-500/25"
              >
                Ban 7d
              </button>
              <button
                onClick={() => ban("perm")}
                className="rounded-full bg-accent-500/15 px-4 py-1.5 text-sm text-accent-400 hover:bg-accent-500/25"
              >
                Permaban
              </button>
            </div>
          </div>

          <Section title={`Reports against (${user.reportsAgainst.length})`}>
            <Reports rows={user.reportsAgainst} />
          </Section>
          <Section title={`Reports filed (${user.reportsFiled.length})`}>
            <Reports rows={user.reportsFiled} />
          </Section>
          <Section title={`Bans (${user.bans.length})`}>
            {user.bans.map((b) => (
              <div key={b.id} className="border-b border-white/5 px-4 py-2 text-sm">
                <span className="text-cream-100/60">{new Date(b.startsAt).toLocaleString()}</span>
                {" — "}
                <span>{b.reason}</span>
                {b.endsAt && <span className="ml-3 text-cream-100/40">until {new Date(b.endsAt).toLocaleString()}</span>}
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-cream-100/50">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/5 px-4 py-3 text-sm uppercase tracking-wider text-cream-100/50">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Reports({
  rows,
}: {
  rows: Array<{ id: string; category: string; createdAt: string; status: string }>;
}) {
  if (rows.length === 0) return <div className="px-4 py-3 text-cream-100/40">None</div>;
  return (
    <div>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-sm">
          <span className="font-mono text-xs text-cream-100/50">{r.id.slice(0, 8)}…</span>
          <span>{r.category}</span>
          <span className="text-cream-100/60">{r.status}</span>
          <span className="text-cream-100/40">{new Date(r.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
