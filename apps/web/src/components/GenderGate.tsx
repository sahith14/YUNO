"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type Gender = "female" | "male" | "prefer_not_to_say";

const OPTIONS: Array<{
  k: Gender;
  label: string;
  sub: string;
  icon: string;
}> = [
  { k: "female", label: "Female", sub: "I want to be matched as a woman.", icon: "♀" },
  { k: "male", label: "Male", sub: "I want to be matched as a man.", icon: "♂" },
  {
    k: "prefer_not_to_say",
    label: "Prefer not to say",
    sub: "Random matches only — gender filters won't apply to me.",
    icon: "·",
  },
];

export function GenderGate({
  open,
  onPick,
}: {
  open: boolean;
  onPick: (g: Gender) => Promise<void>;
}) {
  const [busy, setBusy] = useState<Gender | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gendergate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 30, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
          >
            <div className="mb-1 font-display text-2xl">Welcome to YUNO</div>
            <div className="mb-5 text-sm text-cream-100/60">
              Quick question — which gender best describes you? This is used for matching only and
              cannot be changed every session. Be honest; respect the strangers you&apos;ll meet.
            </div>

            <div className="grid gap-2.5">
              {OPTIONS.map((o) => (
                <button
                  key={o.k}
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(o.k);
                    try {
                      await onPick(o.k);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-glow-400/60 hover:bg-glow-500/10 disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-2xl text-cream-50 group-hover:bg-glow-500/20">
                    {o.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{o.label}</div>
                    <div className="text-xs text-cream-100/50">{o.sub}</div>
                  </div>
                  {busy === o.k && (
                    <span className="text-xs text-glow-400">Saving…</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 text-[11px] leading-relaxed text-cream-100/40">
              YUNO does not verify gender at this stage. Gender-filtered matching is best-effort and
              may pair you with users whose self-declared gender differs from their identity.
              Verified accounts (coming soon) will guarantee filter accuracy.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
