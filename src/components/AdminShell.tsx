import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { adminLogout } from "@/app/actions";
import { SITE_NAME } from "@/lib/site";
import { adminTabs, type AdminTab } from "@/lib/admin-tabs";
import { AdminBottomNav } from "@/components/AdminBottomNav";
import { CommandPalette } from "@/components/CommandPalette";

export type { AdminTab } from "@/lib/admin-tabs";

export function AdminShell({ active, children }: { active: AdminTab; children: ReactNode }) {
  const current = adminTabs.find((tab) => tab.key === active) ?? adminTabs[0];

  return (
    <div className="min-h-dvh">
      <header className="topbar sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/" aria-label={`${SITE_NAME} — beranda`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/int.svg" alt={SITE_NAME} className="h-6 w-auto" />
            </Link>
            <div className="hidden items-center gap-1 overflow-x-auto sm:flex" aria-label="Navigasi admin">
              {adminTabs.map((tab) => {
                const on = active === tab.key;
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-sharp)] px-2.5 py-2 text-[13px] font-medium transition-colors lg:px-3 ${
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
              <button type="submit" className="btn btn-ghost !h-10 !px-3 text-xs" aria-label="Keluar dari admin">
                <LogOut aria-hidden className="size-4 sm:hidden" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="konten" className="wrap pb-[calc(var(--bottom-bar-safe)+1.5rem)] pt-10 sm:pb-12 sm:pt-12">
        {children}
      </main>

      <CommandPalette />

      <AdminBottomNav active={active} />
    </div>
  );
}
