"use client";

import Link from "next/link";

export function TopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="topbar sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2" aria-label="in.torma, beranda">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/int.svg" alt="in.torma" className="h-6 w-auto" />
      </Link>
      <nav className="flex items-center gap-1">
        <Link href="/order" className="px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
          Pesan
        </Link>
        <Link href="/lacak" className="px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
          Lacak
        </Link>
        <a
          href="https://wa.me/6289617607952"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]"
        >
          WhatsApp
        </a>
        {isAdmin && (
          <Link href="/dashboard" className="ml-2 px-3 py-1.5 text-sm text-[var(--gold)] hover:text-[var(--gold-2)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
            Dashboard
          </Link>
        )}
      </nav>
    </header>
  );
}