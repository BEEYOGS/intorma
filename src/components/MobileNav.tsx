"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";
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
import { InstallNavButton } from "@/components/PWA";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";

type NavLink = { href: string; label: string; icon: LucideIcon };

export function MobileNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useOverlayRegistration("mobile-nav", open, closeMenu);

  useEffect(() => {
    if (!open) return;
    const focusable = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
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
    "flex min-h-12 items-center gap-3 rounded-[var(--radius-sharp)] px-3 text-sm text-[var(--text-2)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text)]";

  const installRow = (
    <InstallNavButton
      className={rowClass}
      iconClassName="size-4 shrink-0 text-accent"
      label="Install aplikasi"
      onOpen={closeMenu}
    />
  );

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid size-12 place-items-center rounded-[var(--radius-sharp)] border border-[var(--border)] text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>

      {open && (
        <div
          ref={menuRef}
          id="mobile-nav-menu"
          aria-label="Menu navigasi"
          className="absolute right-0 top-14 z-50 max-h-[70dvh] w-[min(17rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-sharp)] border border-[var(--border)] bg-[var(--panel)] p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
        >
          <nav aria-label="Navigasi seluler" className="grid">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/katalog" && pathname.startsWith(`${href}/`));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={`${rowClass} ${active ? "bg-white/[0.05] text-ink" : ""}`}
                >
                  <Icon aria-hidden className={`size-4 shrink-0 ${active ? "text-accent" : "text-[var(--text-3)]"}`} strokeWidth={1.8} />
                  {label}
                </Link>
              );
            })}
            <WhatsAppLink
              text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
              onClick={closeMenu}
              className={rowClass}
            >
              <WhatsAppIcon aria-hidden className="size-4 shrink-0 text-[var(--text-3)]" />
              WhatsApp
            </WhatsAppLink>
            {installRow}
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
