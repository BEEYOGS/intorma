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
      className={mobile ? "flex gap-1 overflow-x-auto pb-0.5" : "hidden items-center gap-1 sm:flex"}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              on ? "bg-ink text-paper" : "text-ink/55 hover:bg-ink/5 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/admin" aria-label={`${SITE_NAME} admin`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/int.svg" alt={SITE_NAME} className="h-7 w-auto" />
            </Link>
            {nav(false)}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink md:inline-flex"
            >
              Lihat situs
            </Link>
            <form action={adminLogout}>
              <button className="rounded-full px-3 py-2 text-sm font-medium text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink">
                Keluar
              </button>
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
