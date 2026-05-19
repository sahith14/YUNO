"use client";

import { motion } from "framer-motion";

interface Props {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onSkip: () => void;
  onLeave: () => void;
  onReport: () => void;
  disableActions?: boolean;
}

export function ControlBar(p: Props) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 24 }}
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-ink-900/80 px-3 py-3 backdrop-blur-xl"
    >
      <CircleButton onClick={p.onToggleMic} active={p.micOn} title={p.micOn ? "Mute" : "Unmute"}>
        {p.micOn ? icons.mic : icons.micOff}
      </CircleButton>
      <CircleButton onClick={p.onToggleCam} active={p.camOn} title={p.camOn ? "Camera off" : "Camera on"}>
        {p.camOn ? icons.cam : icons.camOff}
      </CircleButton>

      <button
        onClick={p.onSkip}
        disabled={p.disableActions}
        className="group flex items-center gap-2 rounded-full bg-cream-50 px-6 py-3 text-base font-semibold text-ink-950 transition hover:scale-[1.03] disabled:opacity-50"
        title="Skip"
      >
        <span>Next</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition group-hover:translate-x-0.5">
          <path
            d="M5 12h14M13 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <CircleButton onClick={p.onReport} variant="danger" title="Report">
        {icons.flag}
      </CircleButton>
      <CircleButton onClick={p.onLeave} variant="muted" title="End">
        {icons.cross}
      </CircleButton>
    </motion.div>
  );
}

function CircleButton({
  children,
  onClick,
  active,
  variant,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  variant?: "danger" | "muted";
  title?: string;
}) {
  const base =
    "flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95";
  const style =
    variant === "danger"
      ? "bg-accent-500/15 text-accent-400 hover:bg-accent-500/25"
      : variant === "muted"
        ? "bg-white/5 text-cream-100/60 hover:text-cream-50 hover:bg-white/10"
        : active === false
          ? "bg-accent-500/20 text-accent-400 hover:bg-accent-500/30"
          : "bg-white/10 text-cream-50 hover:bg-white/15";
  return (
    <button onClick={onClick} title={title} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

const icons = {
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  micOff: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 9v3a3 3 0 005.5 1.7M15 11V6a3 3 0 00-6-.5M5 11a7 7 0 0010.6 6M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  cam: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 10l5-3v10l-5-3z" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  camOff: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M21 7v10l-5-3M16 7v3M3 6h9v12H3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  flag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 21V5h11l-1 4h6l-2 5h-4l1 4H6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  cross: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};
