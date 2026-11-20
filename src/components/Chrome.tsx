"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallButton } from "@/components/PWA";
import { Barcode, ToneChips, RegMark, ScrollProgress } from "@/components/Press";
import { SITE_NAME, TAGLINE, waDisplay, waLink } from "@/lib/site";

const wordmark = { src: "/int.svg", alt: `${SITE_NAME} — ${TAGLINE}` };

const links = [
  { href: "/#layanan", id: "layanan", label: "Layanan" },
  { href: "/#cara-kerja", id: "cara-kerja", label: "Cara kerja" },
  { href: "/#pembayaran", id: "pembayaran", label: "Pembayaran" },
];

export function Nav() {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setActive(null);
      return;
    }
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <ScrollProgress />
      <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="wrap flex h-[4.25rem] items-center justify-between gap-4">
          <Link href="/" aria-label={`${SITE_NAME}, beranda`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...wordmark} alt={wordmark.alt} className="h-8 w-auto sm:h-9" />
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-7 text-sm font-medium md:flex">
            {links.map((l) => (
              <Link
                key={l.id}
                href={l.href}
                aria-current={active === l.id ? "true" : undefined}
                className={`relative py-1 transition-colors ${
                  active === l.id ? "text-ink" : "text-ink/65 hover:text-ink"
                }`}
              >
                {l.label}
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 left-0 h-px bg-ink transition-all duration-300 ${
                    active === l.id ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            ))}
            <Link
              href="/lacak"
              className={`relative py-1 transition-colors ${
                pathname.startsWith("/lacak") ? "text-ink" : "text-ink/65 hover:text-ink"
              }`}
            >
              Lacak pesanan
              <span
                aria-hidden
                className={`absolute -bottom-0.5 left-0 h-px bg-ink transition-all duration-300 ${
                  pathname.startsWith("/lacak") ? "w-full" : "w-0"
                }`}
              />
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/lacak"
              className="inline-flex min-h-11 items-center rounded-tag-sm px-3 text-sm font-medium text-ink/65 transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
            >
              Lacak
            </Link>
            <Link href="/order" className="btn-primary min-h-11 px-4 py-2 text-sm sm:px-5">
              Pesan
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className="grid size-11 place-items-center rounded-tag-sm text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
            >
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 top-[4.25rem] z-40 overflow-y-auto bg-paper/95 backdrop-blur-lg md:hidden">
          <nav aria-label="Navigasi seluler" className="wrap flex flex-col gap-1 py-8">
            {[...links, { href: "/lacak", id: "lacak", label: "Lacak pesanan" }, { href: "/order", id: "order", label: "Pesan desain" }].map((l, i) => (
              <Link
                key={l.id}
                href={l.href}
                onClick={() => setOpen(false)}
                className="enter flex items-center justify-between border-b border-line py-5 text-2xl font-bold tracking-tight text-ink transition-colors hover:text-ink"
                style={{ "--enter-delay": `${i * 60}ms` } as React.CSSProperties}
              >
                {l.label}
                <span aria-hidden className="text-mute">→</span>
              </Link>
            ))}
            <div className="mt-8 flex items-center justify-between">
              <ToneChips />
              <a href={waLink()} target="_blank" rel="noreferrer" className="font-mono text-xs uppercase tracking-[0.2em] text-mute">
                {waDisplay}
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-sand">
      <div className="wrap py-14 sm:py-20">
        <div className="grid gap-12 border-b border-line pb-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-20">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...wordmark} alt={wordmark.alt} className="h-9 w-auto" />
            <p className="mt-6 max-w-sm text-[15px] leading-6 text-ink/60">
              Studio desain &amp; cetak independen. Logo, poster, konten sosial, kemasan, sampai spanduk
              dan kartu nama. Brief singkat, harga jelas, progres bisa dipantau.
            </p>
            <a href={waLink()} target="_blank" rel="noreferrer" className="btn-primary mt-7">
              Chat WhatsApp <span aria-hidden="true">→</span>
            </a>
            <InstallButton />
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <nav aria-label="Tautan situs" className="flex flex-col gap-3">
              <p className="eyebrow mb-1">Situs</p>
              <Link href="/order" className="text-ink/75 transition-colors hover:text-ink">Pesan desain</Link>
              <Link href="/lacak" className="text-ink/75 transition-colors hover:text-ink">Lacak pesanan</Link>
              <Link href="/#layanan" className="text-ink/75 transition-colors hover:text-ink">Layanan &amp; harga</Link>
              <Link href="/#pembayaran" className="text-ink/75 transition-colors hover:text-ink">Pembayaran</Link>
            </nav>
            <div className="flex flex-col gap-3">
              <p className="eyebrow mb-1">Kontak</p>
              <a href={waLink()} target="_blank" rel="noreferrer" className="text-ink/75 transition-colors hover:text-ink">
                WhatsApp
              </a>
              <a href="https://instagram.com/aku.vza" target="_blank" rel="noreferrer" className="text-ink/75 transition-colors hover:text-ink">
                Instagram @aku.vza
              </a>
              <span className="font-mono text-xs text-mute">{waDisplay}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-mute">
            <RegMark className="size-3.5 text-ink/60" />
            <p>© {new Date().getFullYear()} {SITE_NAME}</p>
            <ToneChips className="size-2" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-mute">{TAGLINE}</p>
        </div>

        <Barcode value="CREATIVE-WITHOUT-IDEA" height={26} className="mt-8 max-w-xs text-ink/20" label="" />
      </div>
    </footer>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-tag-sm border border-line bg-panel/80 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/85">
      <span aria-hidden className="status-dot" style={{ background: color, boxShadow: `0 0 8px ${color}66` }} />
      {label}
    </span>
  );
}