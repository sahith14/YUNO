"use client";

import { useState } from "react";
import Link from "next/link";

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (product: "premium" | "verified") => {
    setLoading(product);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${localStorage.getItem("yuno_jwt") ?? ""}`,
        },
        body: JSON.stringify({ product }),
      });
      const data = await r.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(
          "Stripe isn't configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PREMIUM_MONTHLY in .env to enable checkout.",
        );
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-dvh bg-ink-950 px-6 py-16 text-cream-50">
      <div className="mx-auto max-w-3xl">
        <Link href="/chat" className="text-sm text-cream-100/50 hover:text-cream-50">
          ← Back to chat
        </Link>
        <h1 className="mt-6 font-display text-4xl">Upgrade YUNO</h1>
        <p className="mt-2 text-cream-100/60">
          Unlock filters, priority queue, and a no-limit experience.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-cream-100/50">Premium</div>
            <div className="mt-2 font-display text-3xl">
              $2.99<span className="text-base text-cream-100/60"> / month</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-cream-100/80">
              <li>✓ Gender filter — unlimited (no 18s cap)</li>
              <li>✓ Up to 5 interest tags</li>
              <li>✓ Priority queue (matched ~3× faster)</li>
              <li>✓ HD video (720p)</li>
              <li>✓ No ads</li>
            </ul>
            <button
              onClick={() => startCheckout("premium")}
              disabled={loading === "premium"}
              className="mt-6 w-full rounded-xl bg-cream-50 py-3 font-semibold text-ink-950 disabled:opacity-50"
            >
              {loading === "premium" ? "Loading…" : "Get Premium"}
            </button>
          </div>

          <div className="rounded-3xl border border-glow-400/40 bg-glow-500/[0.06] p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-glow-400">Verified</div>
            <div className="mt-2 font-display text-3xl">
              $2.99<span className="text-base text-cream-100/60"> / month</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-cream-100/80">
              <li>✓ ID-verified gender badge (everyone sees you&apos;re real)</li>
              <li>✓ +200 reputation floor</li>
              <li>✓ Match with other Verified users</li>
              <li>✓ Higher trust → fewer false reports</li>
              <li>✓ Reduces catfish encounters for everyone</li>
            </ul>
            <button
              onClick={() => startCheckout("verified")}
              disabled={loading === "verified"}
              className="mt-6 w-full rounded-xl bg-glow-500/20 py-3 font-semibold text-glow-400 hover:bg-glow-500/30 disabled:opacity-50"
            >
              {loading === "verified" ? "Loading…" : "Get Verified"}
            </button>
          </div>
        </div>

        <p className="mt-10 text-xs text-cream-100/40">
          Stripe handles all payments and identity verification. We never store payment info or
          government ID images.
        </p>
      </div>
    </main>
  );
}
