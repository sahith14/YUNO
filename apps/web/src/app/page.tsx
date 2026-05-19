import Link from "next/link";

export default function Landing() {
  return (
    <main className="relative min-h-dvh bg-ink-950 text-cream-50 overflow-hidden">
      {/* Atmospheric backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-yuno-radial" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-glow-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/3 h-[480px] w-[480px] rounded-full bg-accent-500/15 blur-[120px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl tracking-tight">
          <span className="text-cream-50">YU</span>
          <span className="text-accent-500">N</span>
          <span className="text-cream-50">O</span>
        </div>
        <nav className="hidden gap-8 text-sm text-cream-100/70 md:flex">
          <Link href="/safety" className="hover:text-cream-50 transition">Safety</Link>
          <Link href="/about" className="hover:text-cream-50 transition">About</Link>
          <Link href="/upgrade" className="hover:text-cream-50 transition">Premium</Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-12 pb-32 text-center md:pt-24">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-cream-100/70 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent-500" />
          live · humans only · no AI
        </p>

        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Real strangers.
          <br />
          <span className="bg-gradient-to-r from-accent-400 via-cream-50 to-glow-400 bg-clip-text text-transparent">
            Real conversations.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-cream-100/70 md:text-xl">
          Open YUNO. In under three seconds, you&apos;re face-to-face with someone real,
          somewhere in the world. Stay or skip. The next moment is always one tap away.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/chat"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-cream-50 px-10 py-5 text-lg font-semibold text-ink-950 shadow-[0_20px_80px_-10px_rgba(255,77,77,0.5)] transition hover:shadow-[0_25px_100px_-10px_rgba(255,77,77,0.65)]"
          >
            <span className="relative z-10">Start chatting</span>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 -ml-12 w-12 -skew-x-12 bg-white/40 opacity-0 transition group-hover:translate-x-[600%] group-hover:opacity-100"
            />
          </Link>
          <p className="text-xs text-cream-100/50">
            No download. No signup. 18+ only.
          </p>
        </div>

        <div className="mt-24 grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { title: "Instant", body: "< 3 seconds to your first stranger." },
            { title: "Mobile-first", body: "Built for the phone in your hand right now." },
            { title: "Safe by design", body: "Human moderators. Real reports. No tolerance." },
          ].map((f) => (
            <div
              key={f.title}
              className="cinematic-border rounded-2xl bg-white/[0.03] p-6 text-left backdrop-blur"
            >
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-cream-100/50">
                {f.title}
              </div>
              <div className="text-cream-50">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center text-xs text-cream-100/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 md:flex-row">
          <div>© {new Date().getFullYear()} YUNO. Real strangers. Real conversations.</div>
          <div className="flex gap-5">
            <Link href="/safety" className="hover:text-cream-100">Safety</Link>
            <Link href="/terms" className="hover:text-cream-100">Terms</Link>
            <Link href="/privacy" className="hover:text-cream-100">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
