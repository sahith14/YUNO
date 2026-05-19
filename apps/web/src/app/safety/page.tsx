export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-cream-50">
      <h1 className="mb-3 font-display text-4xl">Safety at YUNO</h1>
      <p className="mb-8 text-cream-100/70">
        We do not tolerate sexual content, harassment, scams, or anyone under 18. Reports are
        reviewed by humans within minutes.
      </p>

      <h2 className="mt-8 font-display text-2xl">If something feels wrong</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-cream-100/80">
        <li>Tap the red flag on the control bar.</li>
        <li>Choose the category that fits.</li>
        <li>The conversation ends immediately and a report goes to our moderation team.</li>
      </ol>

      <h2 className="mt-10 font-display text-2xl">What we do, in order</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-cream-100/80">
        <li>Auto-detect sexual content with on-device + server-side classifiers.</li>
        <li>Human moderators review flagged sessions 24/7.</li>
        <li>Bans are issued by reputation: shadow-ban, 24h, 7d, or permanent.</li>
        <li>CSAM is reported to NCMEC (US) and InHope (international) within minutes.</li>
        <li>Verified users get higher trust and unlock filters.</li>
      </ul>

      <h2 className="mt-10 font-display text-2xl">Privacy</h2>
      <p className="mt-3 text-cream-100/80">
        Conversations are not recorded. Video and audio go peer-to-peer between you and the
        stranger — we never see them. Reports may capture a single thumbnail to verify the report;
        thumbnails are deleted in 30 days unless escalated.
      </p>

      <h2 className="mt-10 font-display text-2xl">Be a good stranger</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-cream-100/80">
        <li>Be kind. The other person is real.</li>
        <li>If you wouldn&apos;t say it to a friend, don&apos;t say it to a stranger.</li>
        <li>Don&apos;t share contact info you wouldn&apos;t share publicly.</li>
        <li>If something feels off, skip. There&apos;s always another conversation.</li>
      </ul>
    </main>
  );
}
