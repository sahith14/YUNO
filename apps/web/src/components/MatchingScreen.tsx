"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function MatchingScreen({
  position,
  etaSeconds,
}: {
  position: number;
  etaSeconds: number;
}) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink-950/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-8 h-24 w-24">
          <div className="absolute inset-0 animate-pulse-soft rounded-full border-2 border-accent-500" />
          <div className="absolute inset-3 animate-pulse-soft rounded-full border border-glow-400/60 [animation-delay:200ms]" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-accent-500 to-glow-500" />
        </div>

        <div className="font-display text-3xl text-cream-50">
          Looking for someone{".".repeat(dots)}
        </div>
        <div className="mt-3 text-sm text-cream-100/60">
          {position > 0 && `Position ${position}`}
          {etaSeconds > 0 && ` · ~${etaSeconds}s`}
        </div>
        <div className="mt-8 text-xs uppercase tracking-[0.3em] text-cream-100/40">
          You can skip any conversation, anytime.
        </div>
      </motion.div>
    </div>
  );
}
