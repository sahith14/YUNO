// Admin layout — separate visual style from consumer app.
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink-950 text-cream-50">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-display text-lg">
            YUNO <span className="text-cream-100/40">/ Mod</span>
          </Link>
          <nav className="flex gap-6 text-sm text-cream-100/70">
            <Link href="/admin" className="hover:text-cream-50">Overview</Link>
            <Link href="/admin/reports" className="hover:text-cream-50">Reports</Link>
            <Link href="/admin/sessions" className="hover:text-cream-50">Live</Link>
            <Link href="/admin/users" className="hover:text-cream-50">Users</Link>
          </nav>
          <Link href="/" className="text-xs text-cream-100/50 hover:text-cream-50">
            Exit
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
