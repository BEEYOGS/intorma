import Link from "next/link";
import { logoutCustomer } from "@/app/actions";
import { MobileNav } from "@/components/MobileNav";
import { getCustomer } from "@/lib/customer-auth";

export async function TopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const customer = await getCustomer();
  const linkClass =
    "px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]";

  return (
    <header className="topbar sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2" aria-label="in.torma, beranda">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/int.svg" alt="in.torma" className="h-6 w-auto" />
      </Link>
      <nav className="hidden items-center gap-1 sm:flex">
        <Link href="/order" className={linkClass}>Pesan</Link>
        <Link href="/lacak" className={linkClass}>Lacak</Link>
        <a href="https://wa.me/6289617607952" target="_blank" rel="noreferrer" className={linkClass}>
          WhatsApp
        </a>
        {customer ? (
          <>
            <Link href="/portal" className="px-3 py-1.5 text-sm text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
              Portal
            </Link>
            <form action={logoutCustomer} className="ml-1">
              <button className="btn btn-ghost !h-8 !px-3 text-xs">Keluar</button>
            </form>
          </>
        ) : (
          <Link href="/masuk" className="ml-1 btn btn-ghost !h-8 !px-3 text-xs">Masuk</Link>
        )}
        {isAdmin && (
          <Link href="/dashboard" className="ml-2 px-3 py-1.5 text-sm text-[var(--gold)] hover:text-[var(--gold-2)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]">
            Dashboard
          </Link>
        )}
      </nav>
      <MobileNav loggedIn={Boolean(customer)} />
    </header>
  );
}
