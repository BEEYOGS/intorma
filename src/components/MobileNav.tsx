"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  LogIn,
  LogOut,
  AtSign,
  LayoutGrid,
  Menu,
  PenLine,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutCustomer } from "@/app/actions";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";

type NavLink = { href: string; label: string; icon: LucideIcon };

export function MobileNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const links: NavLink[] = [
    { href: "/katalog", label: "Katalog", icon: LayoutGrid },
    { href: "/order", label: "Pesan", icon: PenLine },
    { href: "/lacak", label: "Lacak pesanan", icon: Search },
    loggedIn
      ? { href: "/portal", label: "Portal", icon: UserRound }
      : { href: "/masuk", label: "Masuk", icon: LogIn },
    ...(loggedIn ? [{ href: "/portal/files", label: "File saya", icon: FolderOpen }] : []),
    { href: "/contact", label: "Kontak", icon: AtSign },
  ];

  const rowClass =
    "flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-3 text-sm text-[var(--text-2)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]";

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
          <nav aria-label="Navigasi seluler" className="grid">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={rowClass}>
                <Icon aria-hidden className="size-4 shrink-0 text-[var(--text-3)]" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
            <WhatsAppLink
              text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
              onClick={() => setOpen(false)}
              className={rowClass}
            >
              <WhatsAppIcon aria-hidden className="size-4 shrink-0 text-[var(--text-3)]" />
              WhatsApp
            </WhatsAppLink>
            {loggedIn && (
              <form action={logoutCustomer} className="mt-1 border-t border-[var(--border)] pt-1">
                <button className={`${rowClass} w-full text-left`}>
                  <LogOut aria-hidden className="size-4 shrink-0 text-[var(--text-3)]" strokeWidth={1.8} />
                  Keluar
                </button>
              </form>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
