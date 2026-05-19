"use client";

import { motion } from "framer-motion";

export type GenderFilter = "any" | "female" | "male";

interface Props {
  modality: "video" | "audio" | "text";
  setModality: (m: "video" | "audio" | "text") => void;
  interests: string[];
  allInterests: { slug: string; label: string; category: string }[];
  toggleInterest: (slug: string) => void;
  maxInterests: number;
  genderFilter: GenderFilter;
  setGenderFilter: (g: GenderFilter) => void;
  isPremium: boolean;
  onUpgrade: () => void;
  onStart: () => void;
  consentChecked: boolean;
  setConsent: (b: boolean) => void;
}

export function LobbyPanel(p: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-3xl border border-white/10 bg-ink-900/80 p-6 backdrop-blur-xl md:p-8"
    >
      {/* Modality */}
      <div>
        <div className="mb-1 font-display text-2xl">Pick a vibe</div>
        <div className="text-sm text-cream-100/60">
          Choose how you want to chat. You can change anytime.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["video", "audio", "text"] as const).map((m) => (
          <button
            key={m}
            onClick={() => p.setModality(m)}
            className={`rounded-2xl border p-4 text-left transition ${
              p.modality === m
                ? "border-accent-500/60 bg-accent-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/30"
            }`}
          >
            <div className="font-medium capitalize">{m}</div>
            <div className="mt-1 text-xs text-cream-100/50">
              {m === "video" ? "See & talk" : m === "audio" ? "Voice only" : "Text only"}
            </div>
          </button>
        ))}
      </div>

      {/* Gender filter */}
      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="font-medium">Match with</div>
            <div className="text-xs text-cream-100/50">
              {p.isPremium ? "Premium · unlimited" : "Free · 18s sessions when filtered"}
            </div>
          </div>
          {!p.isPremium && p.genderFilter !== "any" && (
            <button
              onClick={p.onUpgrade}
              className="rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-400 hover:bg-accent-500/25"
            >
              Unlock $2.99/mo →
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { k: "any", label: "Anyone", sub: "no filter" },
            { k: "female", label: "Women", sub: "♀" },
            { k: "male", label: "Men", sub: "♂" },
          ] as const).map((o) => (
            <button
              key={o.k}
              onClick={() => p.setGenderFilter(o.k)}
              className={`rounded-2xl border px-3 py-3 text-center transition ${
                p.genderFilter === o.k
                  ? o.k === "any"
                    ? "border-cream-50/40 bg-white/10"
                    : "border-glow-400/60 bg-glow-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/30"
              }`}
            >
              <div className="font-medium">{o.label}</div>
              <div className="mt-1 text-xs text-cream-100/50">{o.sub}</div>
            </button>
          ))}
        </div>
        {!p.isPremium && p.genderFilter !== "any" && (
          <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <span className="font-medium">Heads up:</span> on the free plan, gender-filtered
            sessions auto-skip after <span className="font-mono">18s</span>. Premium ($2.99/mo)
            removes the limit.
          </div>
        )}
      </div>

      {/* Interests */}
      <div>
        <div className="mb-2 flex items-end justify-between">
          <div className="font-medium">Interests</div>
          <div className="text-xs text-cream-100/50">
            {p.interests.length} / {p.maxInterests}
          </div>
        </div>
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
          {p.allInterests.map((i) => {
            const active = p.interests.includes(i.slug);
            return (
              <button
                key={i.slug}
                onClick={() => p.toggleInterest(i.slug)}
                disabled={!active && p.interests.length >= p.maxInterests}
                className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-30 ${
                  active
                    ? "border-glow-400/60 bg-glow-500/15 text-cream-50"
                    : "border-white/10 bg-white/[0.02] hover:border-white/30"
                }`}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <input
          type="checkbox"
          checked={p.consentChecked}
          onChange={(e) => p.setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-accent-500"
        />
        <div className="text-xs text-cream-100/70 leading-relaxed">
          I am 18 or older. I will be respectful. Nudity, harassment, and minors are immediate
          bans. Conversations are not stored.
        </div>
      </label>

      <button
        onClick={p.onStart}
        disabled={!p.consentChecked}
        className="mt-1 w-full rounded-2xl bg-cream-50 py-4 text-lg font-semibold text-ink-950 transition hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100"
      >
        Find someone now
      </button>
    </motion.div>
  );
}
