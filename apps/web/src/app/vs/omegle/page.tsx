import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "YUNO vs Omegle — Side-by-Side Comparison (2026)",
  description:
    "An honest, head-to-head comparison of YUNO and Omegle. Mobile UX, moderation, safety, pricing, features. Pick the right random video chat app.",
  alternates: { canonical: "/vs/omegle" },
  openGraph: {
    title: "YUNO vs Omegle — Side-by-Side",
    description:
      "Mobile-first, modern, safe random video chat — vs. the legacy desktop app that shut down.",
    type: "article",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
    { "@type": "ListItem", position: 2, name: "Compare", item: `${APP_URL}/vs` },
    {
      "@type": "ListItem",
      position: 3,
      name: "YUNO vs Omegle",
      item: `${APP_URL}/vs/omegle`,
    },
  ],
};

const ROWS: Array<{ feature: string; yuno: string; omegle: string; winner: "y" | "o" | "t" }> = [
  { feature: "Status", yuno: "Live, growing, 2026", omegle: "Shut down November 2023", winner: "y" },
  { feature: "Mobile experience", yuno: "Built mobile-first, single-handed UX", omegle: "Desktop-first, mobile was an afterthought", winner: "y" },
  { feature: "Time to first stranger", yuno: "Under 3 seconds", omegle: "5–10 seconds (was)", winner: "y" },
  { feature: "Signup required", yuno: "No — guest by default", omegle: "No", winner: "t" },
  { feature: "Random video chat", yuno: "Yes", omegle: "Yes", winner: "t" },
  { feature: "Voice-only mode", yuno: "Yes — saves data", omegle: "No", winner: "y" },
  { feature: "Text-only mode", yuno: "Yes", omegle: "Yes", winner: "t" },
  { feature: "Interest tags", yuno: "60+ curated, dynamic queue", omegle: "Free-text (abuse-prone)", winner: "y" },
  { feature: "Gender filter", yuno: "Yes (Premium $2.99/mo)", omegle: "No", winner: "y" },
  { feature: "Country filter", yuno: "Yes (Premium)", omegle: "No", winner: "y" },
  { feature: "Verified accounts", yuno: "Optional ($2.99/mo, Stripe Identity)", omegle: "No", winner: "y" },
  { feature: "Real-time NSFW detection", yuno: "Yes (on-device + server)", omegle: "Limited", winner: "y" },
  { feature: "Human moderation team", yuno: "24/7, < 5-min response SLA", omegle: "Volunteers, slow", winner: "y" },
  { feature: "Reporting flow", yuno: "Two taps, captures evidence frame", omegle: "Form-based, no evidence", winner: "y" },
  { feature: "Reputation system", yuno: "Yes, silent", omegle: "No", winner: "y" },
  { feature: "Conversation recording", yuno: "Never. Peer-to-peer encrypted.", omegle: "Recorded server-side (per ToS)", winner: "y" },
  { feature: "Bots / AI personas", yuno: "Zero — humans only by design", omegle: "None claimed", winner: "t" },
  { feature: "Design quality", yuno: "Cinematic dark mode, modern", omegle: "Last updated ~2010", winner: "y" },
  { feature: "Free", yuno: "Yes — full random chat", omegle: "Was", winner: "t" },
  { feature: "Premium pricing", yuno: "$2.99 / month", omegle: "Was free / unmonetized", winner: "t" },
  { feature: "Built for 2026 mobile networks", yuno: "Yes — adaptive bitrate, voice-mode for cellular", omegle: "No", winner: "y" },
];

export default function VsOmeglePage() {
  return (
    <main className="relative min-h-dvh bg-ink-950 text-cream-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="pointer-events-none absolute inset-0 bg-yuno-radial" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl tracking-tight">
          <span className="text-cream-50">YU</span>
          <span className="text-accent-500">N</span>
          <span className="text-cream-50">O</span>
        </Link>
        <Link
          href="/chat"
          className="rounded-full bg-cream-50 px-5 py-2 text-sm font-semibold text-ink-950"
        >
          Try YUNO →
        </Link>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-8 pb-24">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-glow-400">
          Comparison · 2026
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          YUNO <span className="text-cream-100/40">vs</span> Omegle
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-cream-100/70">
          A side-by-side look at YUNO and Omegle on the things that actually matter:
          mobile UX, moderation, safety, features, and price.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="px-4 py-3 text-left font-medium text-cream-100/60">Feature</th>
                <th className="px-4 py-3 text-left font-medium text-cream-50">YUNO</th>
                <th className="px-4 py-3 text-left font-medium text-cream-100/60">Omegle</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium text-cream-100/80">{row.feature}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {row.winner === "y" && (
                        <span className="mt-0.5 text-emerald-400">✓</span>
                      )}
                      {row.winner === "t" && (
                        <span className="mt-0.5 text-cream-100/40">·</span>
                      )}
                      <span className="text-cream-50">{row.yuno}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cream-100/60">{row.omegle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 font-display text-2xl md:text-3xl">
          The verdict
        </h2>
        <p className="mt-4 text-cream-100/70">
          Omegle invented this category and doesn&apos;t exist anymore. YUNO is what the
          category should look like in 2026: mobile-first, beautifully designed, safe by
          design, and free at the core. If you used to use Omegle and you&apos;ve been
          looking for a replacement, you&apos;ll feel right at home here.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="rounded-full bg-cream-50 px-6 py-3 font-semibold text-ink-950 hover:scale-[1.02] transition"
          >
            Start chatting on YUNO →
          </Link>
          <Link
            href="/omegle-alternative"
            className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-cream-50 hover:bg-white/10"
          >
            Read the full Omegle-alternative guide
          </Link>
        </div>

        <p className="mt-12 text-xs text-cream-100/40">
          <strong>Trademark notice:</strong> &ldquo;Omegle&rdquo; is a trademark of its
          respective owners and is referenced here for fair-use comparison only. YUNO is
          not affiliated with Omegle.
        </p>
      </section>
    </main>
  );
}
