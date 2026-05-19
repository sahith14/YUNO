import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "YUNO — Real strangers. Real conversations.",
  description:
    "Anonymous random video chat. Talk to a real human, anywhere in the world. No bots. No AI. No fakes.",
  applicationName: "YUNO",
  themeColor: "#06060a",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "YUNO",
    description: "Real strangers. Real conversations.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "YUNO" },
  icons: { icon: "/favicon.svg" },
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
