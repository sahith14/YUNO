import "./globals.css";
import type { Metadata, Viewport } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  // Title strategy: short brand + intent keywords. Per-page can override via
  // `export const metadata = { title: "..." }` and our template prefixes "YUNO".
  title: {
    default: "YUNO — Random Video Chat with Real Strangers (Omegle alternative)",
    template: "%s · YUNO",
  },

  // Description targets the highest-volume queries: "omegle alternative",
  // "random video chat", "talk to strangers", "anonymous chat".
  description:
    "YUNO is a free, anonymous random video chat app — the modern alternative to Omegle. Talk to real strangers worldwide in seconds. No bots, no AI, no signup. Mobile-friendly, safe, beautifully designed.",

  applicationName: "YUNO",
  generator: "YUNO",
  keywords: [
    "random video chat",
    "omegle alternative",
    "sites like omegle",
    "omegle replacement",
    "talk to strangers",
    "stranger chat",
    "anonymous chat",
    "video chat with strangers",
    "free random video chat",
    "chatroulette alternative",
    "monkey alternative",
    "camsurf alternative",
    "online video chat",
    "meet new people online",
    "random chat online",
    "mobile video chat strangers",
    "yuno chat",
    "yuno app",
  ],

  authors: [{ name: "YUNO" }],
  creator: "YUNO",
  publisher: "YUNO",

  // Open Graph (Facebook, WhatsApp, LinkedIn, Telegram, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "YUNO",
    title: "YUNO — Random Video Chat. Real Strangers. (Omegle alternative)",
    description:
      "The modern, mobile-first alternative to Omegle. Open YUNO, tap Start, and you're face-to-face with a real human in seconds. Anonymous. Safe. No AI.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "YUNO — Real strangers. Real conversations.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "YUNO — Random Video Chat (Omegle alternative)",
    description:
      "Anonymous random video chat with real humans. The post-Omegle generation, rebuilt for 2026.",
    images: ["/og-default.png"],
    creator: "@yunoapp",
    site: "@yunoapp",
  },

  // Robots — let everything be indexed in production
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: APP_URL,
  },

  // Icons + manifest
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",

  // Helpful for app store / pwa context
  category: "social",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink-950">
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
