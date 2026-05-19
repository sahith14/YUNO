import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Best Omegle Alternative in 2026 — Random Video Chat",
  description:
    "Looking for an alternative to Omegle? YUNO is the modern, mobile-first replacement for Omegle. Real strangers, free random video chat, aggressive moderation, no bots, no AI. Try it free.",
  alternates: { canonical: "/omegle-alternative" },
  openGraph: {
    title: "The Best Omegle Alternative — YUNO",
    description:
      "Random video chat with real humans. The modern, mobile-first Omegle replacement.",
    type: "article",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Omegle alternative",
      item: `${APP_URL}/omegle-alternative`,
    },
  ],
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Best Omegle Alternative in 2026",
  description:
    "An honest look at what made Omegle special, why it died, and how YUNO is the modern replacement.",
  author: { "@type": "Organization", name: "YUNO" },
  datePublished: "2026-01-15",
  dateModified: new Date().toISOString().split("T")[0],
  publisher: {
    "@type": "Organization",
    name: "YUNO",
    logo: { "@type": "ImageObject", url: `${APP_URL}/og-default.png` },
  },
};

export default function OmegleAlternativePage() {
  return (
    <main className="relative min-h-dvh bg-ink-950 text-cream-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="pointer-events-none absolute inset-0 bg-yuno-radial" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl tracking-tight">
          <span className="text-cream-50">YU</span>
          <span className="text-accent-500">N</span>
          <span className="text-cream-50">O</span>
        </Link>
        <Link
          href="/chat"
          className="rounded-full bg-cream-50 px-5 py-2 text-sm font-semibold text-ink-950 hover:scale-[1.02] transition"
        >
          Try YUNO →
        </Link>
      </header>

      <article className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24 pt-8">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-accent-500">
          Stranger chat · 2026
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          The best Omegle alternative
          <br />
          <span className="text-cream-100/70">isn&apos;t another Omegle.</span>
        </h1>

        <p className="mt-6 text-lg text-cream-100/70 md:text-xl">
          Omegle shut down in November 2023 after 14 years and around 70 million monthly
          users. The hole it left is real — and it isn&apos;t filled by &ldquo;Omegle
          clones&rdquo; bolting random chat onto a 2009 UI. YUNO is what comes next:
          mobile-first, beautifully designed, and aggressively moderated.
        </p>

        <div className="my-10 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="rounded-full bg-cream-50 px-6 py-3 font-semibold text-ink-950 hover:scale-[1.02] transition"
          >
            Open YUNO now (free)
          </Link>
          <Link
            href="/vs/omegle"
            className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 font-medium text-cream-50 hover:bg-white/10"
          >
            See the head-to-head comparison
          </Link>
        </div>

        <h2 className="mt-14 font-display text-2xl md:text-3xl">
          What people actually want when they search &ldquo;Omegle alternative&rdquo;
        </h2>
        <p className="mt-4 text-cream-100/70">
          The thing that made Omegle a habit wasn&apos;t the technology — WebRTC is open
          source, anyone can build it. It was a feeling: <em>open the page, in three
          seconds you&apos;re looking at someone real, somewhere in the world, and you
          have no idea who they are or what they&apos;ll say.</em> That moment is the
          entire product. YUNO is built around protecting it.
        </p>

        <h2 className="mt-12 font-display text-2xl md:text-3xl">
          What YUNO does that Omegle never did
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 text-cream-100/80">
          <li>
            <strong className="text-cream-50">Mobile-first.</strong> Most users today are
            on phones, not desktops. YUNO is built for one-handed, vertical, on-the-bus
            usage from day one.
          </li>
          <li>
            <strong className="text-cream-50">Aggressive human moderation.</strong>{" "}
            Reports get reviewed in under 5 minutes. Real-time NSFW classifiers. Zero
            tolerance for minors or sexual content.
          </li>
          <li>
            <strong className="text-cream-50">Real choice, not a flat queue.</strong>{" "}
            Filter by interests, gender (Premium), or country. Stay random or get
            specific.
          </li>
          <li>
            <strong className="text-cream-50">Beautiful, calm design.</strong> No banner
            ads stacked five-high. No 90s-era grey textareas. A product that looks like
            it belongs on a Pixel or iPhone.
          </li>
          <li>
            <strong className="text-cream-50">Free, no signup.</strong> Open YUNO, allow
            your camera, you&apos;re chatting in three seconds. No email, no phone, no
            verification gate.
          </li>
          <li>
            <strong className="text-cream-50">
              No AI, no bots, no fake users.
            </strong>{" "}
            Every match is a real human. We never pad the platform with synthetic
            engagement.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl md:text-3xl">
          What YUNO doesn&apos;t do (deliberately)
        </h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 text-cream-100/80">
          <li>
            We don&apos;t store conversations. Video and audio go peer-to-peer, encrypted
            via WebRTC. We never see them.
          </li>
          <li>
            We don&apos;t sell ads inside conversations. The only ad placements are in
            the lobby — never during a chat.
          </li>
          <li>
            We don&apos;t gamify identity with badges, streaks, or follower counts. The
            unit of value is the conversation, not the timeline.
          </li>
          <li>
            We don&apos;t allow users under 18. Age gate at signup, automated detection,
            instant ban + report on detection.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl md:text-3xl">
          YUNO is free. How does that work?
        </h2>
        <p className="mt-4 text-cream-100/70">
          The core experience — random video, voice, and text chat with strangers — is
          completely free, forever. Optional <strong>Premium ($2.99/month)</strong>{" "}
          unlocks gender filters, country filters, HD video, priority queue, and removes
          ads. Most users never pay and that&apos;s fine — Premium users fund free users,
          like Spotify.
        </p>

        <h2 className="mt-12 font-display text-2xl md:text-3xl">
          Try it now
        </h2>
        <p className="mt-4 text-cream-100/70">
          The fastest way to know if YUNO is the Omegle alternative for you is to use it.
          It takes about ten seconds.
        </p>
        <div className="mt-6">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-8 py-4 text-lg font-semibold text-cream-50 hover:bg-accent-600 transition"
          >
            Start chatting on YUNO →
          </Link>
        </div>

        <hr className="my-16 border-white/5" />

        <p className="text-xs text-cream-100/40">
          <strong>Trademark notice:</strong> &ldquo;Omegle&rdquo; is a trademark of its
          respective owners and is referenced here only to identify and compare. YUNO is
          not affiliated with, endorsed by, or sponsored by Omegle.
        </p>
      </article>
    </main>
  );
}
