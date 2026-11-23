"use client";

import Link from "next/link";
import { adminLogout } from "@/app/actions";

export function AdminTopBar() {
  return (
    <header className="topbar sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-sm border-b border-[var(--border)]">
      <div className="flex items-center gap-6">
        <Link href="/" aria-label="in.torma, beranda">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/int.svg" alt="in.torma" className="h-6 w-auto" />
        </Link>
        <span className="text-xs text-[var(--text-3)]">admin</span>
      </div>
      <nav className="flex items-center gap-1">
        <Link href="/dashboard" className="px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => adminLogout()}
          className="btn btn-ghost !h-8 !px-3 text-xs ml-2"
        >
          Keluar
        </button>
      </nav>
    </header>
  );
}