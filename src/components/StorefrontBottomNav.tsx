"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Info, Search } from "lucide-react";

const TABS = [
  { href: "/katalog", label: "Katalog", icon: Search },
  { href: "/order", label: "Order", icon: ClipboardList },
  { href: "/lacak", label: "Lacak", icon: BookOpen },
  { href: "/contact", label: "Info", icon: Info },
];

export function StorefrontBottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--bg)]/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-[var(--text)]" : "text-[var(--text-3)]"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[var(--accent)]" />}
                <Icon aria-hidden className="size-[18px]" strokeWidth={active ? 2 : 1.7} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
