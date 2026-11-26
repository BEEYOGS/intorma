import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardList, ExternalLink, History, Layers3, LogOut, Settings2, UsersRound } from "lucide-react";
import { adminLogout } from "@/app/actions";
import { SITE_NAME } from "@/lib/site";
import { CommandPalette } from "@/components/CommandPalette";

const tabs = [
  { href: "/admin", label: "Pesanan", short: "Pesanan", key: "orders", icon: ClipboardList },
  { href: "/admin/analitik", label: "Analitik", short: "Analitik", key: "analytics", icon: BarChart3 },
  { href: "/admin/pelanggan", label: "Pelanggan", short: "Pelanggan", key: "customers", icon: UsersRound },
  { href: "/admin/layanan", label: "Layanan & harga", short: "Layanan", key: "services", icon: Layers3 },
  { href: "/admin/audit", label: "Log aktivitas", short: "Audit", key: "audit", icon: History },
  { href: "/admin/pengaturan", label: "Pengaturan", short: "Setelan", key: "settings", icon: Settings2 },
] as const;

export type AdminTab = (typeof tabs)[number]["key"];

export function AdminShell({ active, children }: { active: AdminTab; children: ReactNode }) {
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div className="min-h-dvh">
      <header className="topbar sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/" aria-label={`${SITE_NAME} — beranda`} className="flex shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt={SITE_NAME} className="size-7 shrink-0" />
              <span className="display hidden text-base font-semibold tracking-tight sm:inline">{SITE_NAME}</span>
            </Link>
            <div className="hidden items-center gap-1 overflow-x-auto sm:flex" aria-label="Navigasi admin">
              {tabs.map((tab) => {
                const on = active === tab.key;
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius)] px-2.5 py-2 text-[13px] font-medium transition-colors lg:px-3 ${
                      on
                        ? "bg-[var(--panel-2)] text-[var(--text)]"
                        : "text-[var(--text-3)] hover:bg-[var(--panel)] hover:text-[var(--text)]"
                    }`}
                  >
                    <Icon aria-hidden className="size-4" strokeWidth={1.8} />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.short}</span>
                  </Link>
                );
              })}
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="eyebrow leading-none">Admin</p>
              <p className="mt-1 truncate text-sm font-semibold leading-none">{current.label}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/"
              aria-label="Lihat situs"
              className="hidden px-3 py-1.5 text-[13px] text-[var(--text-3)] transition-colors hover:text-[var(--text)] md:inline-flex"
            >
              Lihat situs <ExternalLink aria-hidden className="ml-1.5 size-3.5" />
            </Link>
            <form action={adminLogout}>
              <button type="submit" className="btn btn-ghost !h-9 !px-3 text-xs" aria-label="Keluar dari admin">
                <LogOut aria-hidden className="size-4 sm:hidden" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="konten" className="wrap pb-32 pt-10 sm:pb-12 sm:pt-12">
        {children}
      </main>

      <CommandPalette />

      <nav
        aria-label="Navigasi admin bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
      >
        <ul className="grid grid-cols-6">
          {tabs.map((tab) => {
            const on = active === tab.key;
            const Icon = tab.icon;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold transition-colors ${
                    on ? "text-[var(--text)]" : "text-[var(--text-3)]"
                  }`}
                >
                  {on && <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-[var(--text)]" />}
                  <span
                    aria-hidden
                    className={`grid size-8 place-items-center rounded-tag-sm transition-colors ${on ? "bg-[var(--panel-2)]" : ""}`}
                  >
                    <Icon className="size-[18px]" strokeWidth={on ? 2 : 1.7} />
                  </span>
                  {tab.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
