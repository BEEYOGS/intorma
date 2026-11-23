import Link from "next/link";
import type { ReactNode } from "react";
import { adminLogout } from "@/app/actions";
import { SITE_NAME } from "@/lib/site";

const tabs = [
  { href: "/admin", label: "Pesanan", key: "orders" },
  { href: "/admin/layanan", label: "Layanan & harga", key: "services" },
  { href: "/admin/pengaturan", label: "Pengaturan", key: "settings" },
] as const;

export type AdminTab = (typeof tabs)[number]["key"];

export function AdminShell({ active, children }: { active: AdminTab; children: ReactNode }) {
  const nav = (mobile: boolean) => (
    <nav
      aria-label="Navigasi admin"
      className={mobile ? "flex gap-1.5 overflow-x-auto pb-0.5" : "hidden items-center gap-1 sm:flex"}
    >
      {tabs.map((tab) => {
        const on = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap rounded-[var(--radius)] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              on
                ? "bg-[var(--panel-2)] text-[var(--text)]"
                : "text-[var(--text-3)] hover:bg-[var(--panel)] hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh">
      <header className="topbar sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
        <div className="wrap flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" aria-label={SITE_NAME} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/int.svg" alt={SITE_NAME} className="h-6 w-auto" />
            </Link>
            {nav(false)}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/" className="hidden px-3 py-1.5 text-[13px] text-[var(--text-3)] transition-colors hover:text-[var(--text)] md:inline-flex">
              Lihat situs
            </Link>
            <form action={adminLogout}>
              <button className="btn btn-ghost !h-8 !px-3 text-xs">Keluar</button>
            </form>
          </div>
        </div>
        <div className="wrap pb-3 sm:hidden">{nav(true)}</div>
      </header>
      <main id="konten" className="wrap py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
