"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Info, Search } from "lucide-react";

const TABS = [
  { href: "/katalog", label: "Katalog", icon: Search },
  { href: "/order", label: "Order", icon: ClipboardList },
  { href: "/lacak", label: "Lacak", icon: BookOpen },
  { href: "/contact", label: "Info", icon: Info },
] as const;

/**
 * Halaman dengan action bar sendiri memakai z-index yang sama dengan nav global.
 * Menyembunyikan nav di sini mencegah dua bar bertumpuk. Detail pesanan tidak
 * perlu nav bawah karena sudah punya tautan kembali dan aksi spesifik.
 */
const HIDDEN_PREFIXES = [
  "/admin",
  "/order",
  "/bayar",
  "/nota",
  "/portal",
  "/masuk",
  "/dashboard",
] as const;

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }
  return /^\/lacak\/[^/]+/.test(pathname);
}

export function StorefrontBottomNav() {
  const pathname = usePathname();
  const hidden = shouldHide(pathname);

  useEffect(() => {
    document.documentElement.dataset.bottomNav = hidden ? "hidden" : "visible";
    return () => {
      delete document.documentElement.dataset.bottomNav;
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      data-mobile-chrome
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[var(--bottom-bar-height)] flex-col items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold leading-none transition-colors ${
                  active ? "text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text)]"
                }`}
              >
                {active && (
                  <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
                <span
                  aria-hidden
                  className={`grid size-8 shrink-0 place-items-center rounded-[var(--radius-sharp)] transition-colors ${
                    active ? "bg-[var(--panel-2)]" : ""
                  }`}
                >
                  <Icon className="size-[18px]" strokeWidth={active ? 2 : 1.7} />
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
