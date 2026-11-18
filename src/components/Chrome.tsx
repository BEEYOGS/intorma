import Link from "next/link";
import { SITE_NAME, TAGLINE, waDisplay, waLink } from "@/lib/site";

const wordmark = { src: "/int.svg", alt: `${SITE_NAME} — ${TAGLINE}` };

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="wrap flex h-[4.25rem] items-center justify-between gap-4">
        <Link href="/" aria-label={`${SITE_NAME}, beranda`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...wordmark} alt={wordmark.alt} className="h-8 w-auto sm:h-9" />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-7 text-sm font-medium text-ink/65 md:flex">
          <Link href="/#layanan" className="transition-colors hover:text-ink">Layanan</Link>
          <Link href="/#cara-kerja" className="transition-colors hover:text-ink">Cara kerja</Link>
          <Link href="/#pembayaran" className="transition-colors hover:text-ink">Pembayaran</Link>
          <Link href="/lacak" className="transition-colors hover:text-ink">Lacak pesanan</Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/lacak"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink/65 transition-colors hover:bg-ink/5 hover:text-ink md:hidden"
          >
            Lacak
          </Link>
          <Link href="/order" className="btn-primary min-h-11 px-4 py-2 text-sm sm:px-5">
            Pesan
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="on-dark bg-[#080808] text-ink">
      <div className="wrap py-14 sm:py-20">
        <div className="grid gap-12 border-b border-white/15 pb-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-20">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...wordmark} alt={wordmark.alt} className="h-9 w-auto" />
            <p className="mt-6 max-w-sm text-[15px] leading-6 text-ink/60">
              Studio desain independen untuk logo, poster, konten sosial, dan kemasan. Brief singkat,
              harga jelas, progres bisa dipantau.
            </p>
            <a href={waLink()} target="_blank" rel="noreferrer" className="btn-on-dark mt-7">
              Chat WhatsApp <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <nav aria-label="Tautan situs" className="flex flex-col gap-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Situs</p>
              <Link href="/order" className="text-ink/75 transition-colors hover:text-ink">Pesan desain</Link>
              <Link href="/lacak" className="text-ink/75 transition-colors hover:text-ink">Lacak pesanan</Link>
              <Link href="/#layanan" className="text-ink/75 transition-colors hover:text-ink">Layanan &amp; harga</Link>
              <Link href="/#pembayaran" className="text-ink/75 transition-colors hover:text-ink">Pembayaran</Link>
            </nav>
            <div className="flex flex-col gap-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">Kontak</p>
              <a href={waLink()} target="_blank" rel="noreferrer" className="text-ink/75 transition-colors hover:text-ink">
                WhatsApp
              </a>
              <a href="https://instagram.com/aku.vza" target="_blank" rel="noreferrer" className="text-ink/75 transition-colors hover:text-ink">
                Instagram @aku.vza
              </a>
              <span className="text-ink/60">{waDisplay}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE_NAME}</p>
          <p className="uppercase tracking-[0.18em]">{TAGLINE}</p>
        </div>
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
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-[12px] font-semibold text-ink/80">
      <span aria-hidden className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}
