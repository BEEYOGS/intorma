import Link from "next/link";

export function Nav({ light = false }: { light?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-5 py-3.5">
        <Link href="/" aria-label="in.tarma, beranda" className="shrink-0 rounded-tag-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/int.svg" alt="in.tarma — Creative without idea" className="h-9 w-auto sm:h-10" />
        </Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
          <Link href="/#layanan" className="rounded-full px-2.5 py-2 text-soft transition-colors hover:text-white sm:px-3">Layanan</Link>
          <Link href="/lacak" className="rounded-full px-2.5 py-2 text-soft transition-colors hover:text-white sm:px-3">
            <span className="sm:hidden">Lacak</span>
            <span className="hidden sm:inline">Lacak pesanan</span>
          </Link>
          <Link href="/order" className={`ml-1 inline-flex items-center gap-2 rounded-tag-sm px-3.5 py-2.5 font-bold transition-all sm:ml-2 sm:px-4 ${light ? "bg-black text-white hover:bg-black/80" : "bg-white text-black hover:bg-soft"}`}>
            Pesan <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-9">
        <Link href="/" aria-label="in.tarma, kembali ke beranda" className="inline-flex rounded-tag-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/int.svg" alt="in.tarma — Creative without idea" className="h-10 w-auto" />
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <p className="text-mute">@aku.vza <span className="px-1 text-white/20">/</span> design studio</p>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-white transition-colors hover:border-white hover:bg-white hover:text-black"
            href="https://wa.me/6289617607952"
            target="_blank"
            rel="noreferrer"
          >
            Chat WhatsApp <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
