"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Visible countdown shown to free users when a gender filter is active.
 * Counts down from 18s. Calls onExpire() at zero (we let the server actually
 * tear down — this is just visual + a fallback skip.)
 */
export function FreeFilterCountdown({
  active,
  startedAt,
  onUpgrade,
}: {
  active: boolean;
  startedAt: number | null;
  onUpgrade: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);

  if (!active || !startedAt) return null;
  const elapsedMs = now - startedAt;
  const remaining = Math.max(0, 18 - Math.floor(elapsedMs / 1000));
  const pct = Math.max(0, Math.min(1, (18_000 - elapsedMs) / 18_000));

  return (
    <AnimatePresence>
      <motion.div
        key="freefilter"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-500/40 bg-ink-900/80 px-4 py-2 backdrop-blur"
      >
        <div className="relative h-7 w-7">
          <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="14"
              cy="14"
              r="12"
              fill="none"
              stroke="rgb(252,211,77)"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 12}
              strokeDashoffset={(1 - pct) * 2 * Math.PI * 12}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-amber-200">
            {remaining}
          </span>
        </div>
        <div className="text-xs">
          <div className="text-amber-200">Free filtered session</div>
          <button onClick={onUpgrade} className="text-cream-100/70 underline-offset-2 hover:underline">
            Unlock unlimited for $2.99/mo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
