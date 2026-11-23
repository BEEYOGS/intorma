"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logoutCustomer } from "@/app/actions";

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

  const links = [
    { href: "/order", label: "Pesan" },
    { href: "/lacak", label: "Lacak pesanan" },
    { href: "/masuk", label: loggedIn ? "Portal" : "Masuk" },
    ...(loggedIn ? [{ href: "/portal/files", label: "File saya" }] : []),
    { href: "/contact", label: "Kontak" },
  ];

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
          <nav aria-label="Navigasi seluler" className="grid">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="min-h-11 flex items-center rounded-[var(--radius)] px-3 text-sm text-[var(--text-2)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://wa.me/6289617607952"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="min-h-11 flex items-center rounded-[var(--radius)] px-3 text-sm text-[var(--text-2)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]"
            >
              WhatsApp
            </a>
            {loggedIn && (
              <form action={logoutCustomer} className="mt-1 border-t border-[var(--border)] pt-1">
                <button className="min-h-11 w-full rounded-[var(--radius)] px-3 text-left text-sm text-mute transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]">
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
