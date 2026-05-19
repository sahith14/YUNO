"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export type ReportCategory = "nsfw" | "minor" | "harassment" | "violence" | "scam" | "other";

const CATS: Array<{ k: ReportCategory; label: string; sub: string }> = [
  { k: "nsfw", label: "Nudity / sexual", sub: "Sexual content or harassment" },
  { k: "minor", label: "Minor / underage", sub: "Person appears to be under 18" },
  { k: "harassment", label: "Harassment", sub: "Bullying, hate speech, threats" },
  { k: "violence", label: "Violence", sub: "Self-harm, gore, threats of violence" },
  { k: "scam", label: "Scam", sub: "Romance scam, phishing, money requests" },
  { k: "other", label: "Other", sub: "Something else inappropriate" },
];

export function ReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (cat: ReportCategory) => Promise<void>;
}) {
  const [busy, setBusy] = useState<ReportCategory | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
          >
            <div className="mb-1 text-lg font-semibold">Report this person</div>
            <div className="mb-5 text-sm text-cream-100/60">
              Reports are reviewed by humans. Misuse damages your reputation.
            </div>
            <div className="grid gap-2">
              {CATS.map((c) => (
                <button
                  key={c.k}
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(c.k);
                    try {
                      await onSubmit(c.k);
                      onClose();
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-accent-500/40 hover:bg-accent-500/5 disabled:opacity-50"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-accent-500 group-hover:animate-pulse-soft" />
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-cream-100/50">{c.sub}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm text-cream-100/70 hover:bg-white/5"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
