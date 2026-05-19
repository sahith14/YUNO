import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// JSON-LD structured data — helps Google understand what YUNO is and rank it
// for relevant queries. We declare three schemas:
//   1. WebSite (with SearchAction) — eligible for sitelinks search box
//   2. SoftwareApplication       — eligible for app rich result
//   3. FAQPage                    — eligible for FAQ rich snippet
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "YUNO",
  alternateName: "YUNO Chat",
  url: APP_URL,
  description:
    "Anonymous random video chat. The modern alternative to Omegle. Talk to real strangers worldwide.",
  inLanguage: "en-US",
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "YUNO",
  applicationCategory: "SocialNetworkingApplication",
  applicationSubCategory: "VideoChat",
  operatingSystem: "Web, iOS, Android",
  description:
    "Anonymous random video chat platform. A safer, modern, mobile-first alternative to Omegle. Real humans only — no bots, no AI, no fake personas.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to use. Optional Premium $2.99/mo unlocks gender filter and more.",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1",
    bestRating: "5",
    worstRating: "1",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is YUNO a good Omegle alternative?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "YUNO is a modern, mobile-first replacement for Omegle. It keeps the random-stranger primitive that made Omegle popular, but adds aggressive moderation, a beautiful interface, gender filters, and a clear no-bots-no-AI policy.",
      },
    },
    {
      "@type": "Question",
      name: "How is YUNO different from Omegle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three big differences: (1) YUNO is mobile-first — Omegle was built for desktop in 2009. (2) Aggressive moderation with human reviewers responds to reports in under 5 minutes. (3) Optional verified accounts and gender filters let you control who you match with. Free, no signup required to start.",
      },
    },
    {
      "@type": "Question",
      name: "Is YUNO free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Random video, audio, and text chat are completely free with no signup. Premium ($2.99/month) unlocks gender filters, country filters, HD video, and priority matching.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account to use YUNO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Tap Start Chatting, allow camera + microphone, and you're connected to a stranger in under 3 seconds. No email, no phone number required.",
      },
    },
    {
      "@type": "Question",
      name: "Is YUNO safe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — safety is the core difference vs older Omegle-style apps. Every session is monitored by human moderators, NSFW content is detected automatically, reports are actioned in minutes, and users under 18 are blocked. Conversations are peer-to-peer encrypted via WebRTC and never recorded.",
      },
    },
    {
      "@type": "Question",
      name: "Does YUNO use AI chatbots?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. YUNO is human-only by design. There are no AI personas, no bots, no synthetic engagement. Every match is a real person somewhere in the world.",
      },
    },
    {
      "@type": "Question",
      name: "Is YUNO available on mobile?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. YUNO works in any modern mobile browser (Chrome, Safari, Edge). No app download required. Native iOS and Android apps are coming soon.",
      },
    },
    {
      "@type": "Question",
      name: "What can I do on YUNO?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Random video chat, voice-only chat, or text chat with strangers from around the world. Filter by interests like K-pop, language exchange, music, or 60+ other tags. Skip anytime in one tap.",
      },
    },
  ],
};

export default function Landing() {
  return (
    <main className="relative min-h-dvh bg-ink-950 text-cream-50 overflow-hidden">
      {/* JSON-LD structured data — three blobs, all rendered server-side for crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

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
          <Link href="/omegle-alternative" className="hover:text-cream-50 transition">
            Omegle alternative
          </Link>
          <Link href="/safety" className="hover:text-cream-50 transition">Safety</Link>
          <Link href="/upgrade" className="hover:text-cream-50 transition">Premium</Link>
        </nav>
      </header>

      {/* HERO */}
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

        <h2 className="mt-6 max-w-xl text-lg text-cream-100/70 md:text-xl">
          The modern <strong className="text-cream-50">Omegle alternative</strong>.
          Anonymous random video chat with real humans, mobile-first and aggressively
          moderated. Open YUNO, tap start, and you&apos;re face-to-face with someone real
          in under three seconds.
        </h2>

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
            No download. No signup. Free forever. 18+ only.
          </p>
        </div>

        {/* Pillars */}
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

      {/* === FAQ — targets Google's "People also ask" + featured snippets === */}
      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="mb-3 font-display text-3xl md:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mb-10 text-cream-100/60">
          Most-asked things about YUNO and how it compares to Omegle and other random
          chat apps.
        </p>

        <div className="space-y-4">
          {[
            {
              q: "Is YUNO a good Omegle alternative?",
              a: "Yes. YUNO keeps the thing that made Omegle special — instant random video chat with real humans — and fixes everything Omegle got wrong: bad moderation, broken mobile experience, outdated UI, and a brand poisoned by association with bad actors. We&apos;re mobile-first, beautifully designed, aggressively moderated, and human-only.",
            },
            {
              q: "How is YUNO different from Omegle?",
              a: "Three big things. (1) Mobile-first — Omegle was a 2009 desktop app. YUNO is built for the phone in your pocket. (2) Aggressive moderation — human reviewers respond to reports in under 5 minutes. (3) Real choices — gender filters, interest tags, country preferences, all without compromising the random-stranger magic.",
            },
            {
              q: "Is YUNO free?",
              a: "Yes. Random video, voice, and text chat are free, with no signup required. Optional Premium ($2.99/month) unlocks gender filter, country filter, HD video, priority matching, and removes ads.",
            },
            {
              q: "Do I need an account to use YUNO?",
              a: "No. Just open the site, allow camera and microphone, pick a vibe, and you&apos;re matched. No email. No phone. No signup. You can optionally create an account later to save preferences and unlock Premium.",
            },
            {
              q: "Is YUNO safe?",
              a: "Safety is YUNO&apos;s core differentiator vs older Omegle-style apps. We have 24/7 human moderators, real-time NSFW detection, an aggressive reporting system, instant shadow-bans, age verification, and zero tolerance for minors or sexual content. Conversations are peer-to-peer encrypted and never recorded.",
            },
            {
              q: "Does YUNO use AI chatbots or fake users?",
              a: "Never. YUNO is human-only by design — that&apos;s the entire product philosophy. No AI personas, no chatbots, no synthetic engagement. Every match is a real person, somewhere in the world.",
            },
            {
              q: "What devices does YUNO work on?",
              a: "Any modern browser on phone, tablet, or computer. Chrome, Safari, Edge, Firefox all supported. No app to download. Native iOS and Android apps coming soon.",
            },
            {
              q: "Why did Omegle shut down and is YUNO the replacement?",
              a: "Omegle shut down in November 2023 after 14 years, citing the impossibility of moderating its scale. YUNO is built from the ground up to solve exactly that problem. We aren&apos;t an Omegle clone — we&apos;re what stranger chat should have looked like in 2024.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="cinematic-border group rounded-2xl bg-white/[0.03] p-5 backdrop-blur"
            >
              <summary className="cursor-pointer list-none text-base font-medium text-cream-50 md:text-lg">
                <span className="mr-2 text-accent-500 transition group-open:rotate-45 inline-block">
                  +
                </span>
                {item.q}
              </summary>
              <p
                className="mt-3 pl-5 text-cream-100/70"
                dangerouslySetInnerHTML={{ __html: item.a }}
              />
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link
            href="/omegle-alternative"
            className="rounded-full border border-glow-400/40 bg-glow-500/10 px-4 py-2 text-glow-400 hover:bg-glow-500/15"
          >
            Why YUNO over Omegle →
          </Link>
          <Link
            href="/safety"
            className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-cream-100/70 hover:border-white/30"
          >
            Read our safety policy
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-10 text-center text-xs text-cream-100/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 md:flex-row">
          <div>© {new Date().getFullYear()} YUNO. Real strangers. Real conversations.</div>
          <div className="flex gap-5">
            <Link href="/omegle-alternative" className="hover:text-cream-100">Omegle alternative</Link>
            <Link href="/safety" className="hover:text-cream-100">Safety</Link>
            <Link href="/terms" className="hover:text-cream-100">Terms</Link>
            <Link href="/privacy" className="hover:text-cream-100">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
