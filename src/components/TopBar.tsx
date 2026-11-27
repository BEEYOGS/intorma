import Link from "next/link";
import {
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  PenLine,
  Search,
  UserRound,
} from "lucide-react";
import { logoutCustomer } from "@/app/actions";
import { MobileNav } from "@/components/MobileNav";
import { InstallNavButton } from "@/components/PWA";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { getCustomer } from "@/lib/customer-auth";

export async function TopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const customer = await getCustomer();
  const linkClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors rounded-[var(--radius)] hover:bg-[var(--panel)]";
  const iconClass = "size-3.5 shrink-0 opacity-70";

  return (
    <header className="topbar sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2" aria-label="in.torma, beranda">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/int.svg" alt="in.torma" className="h-6 w-auto" />
      </Link>
      <nav className="hidden items-center gap-1 sm:flex">
        <Link href="/katalog" className={linkClass}>
          <LayoutGrid aria-hidden className={iconClass} /> Katalog
        </Link>
        <Link href="/order" className={linkClass}>
          <PenLine aria-hidden className={iconClass} /> Pesan
        </Link>
        <Link href="/lacak" className={linkClass}>
          <Search aria-hidden className={iconClass} /> Lacak
        </Link>
        <InstallNavButton className={`${linkClass} hidden md:inline-flex`} />
        <WhatsAppLink
          text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
          className={linkClass}
        >
          <WhatsAppIcon aria-hidden className={iconClass} /> WhatsApp
        </WhatsAppLink>
        {customer ? (
          <>
            <Link href="/portal" className={`${linkClass} !text-[var(--text)]`}>
              <UserRound aria-hidden className={iconClass} /> Portal
            </Link>
            <Link href="/portal/files" className={linkClass}>
              <FolderOpen aria-hidden className={iconClass} /> File
            </Link>
            <form action={logoutCustomer} className="ml-1">
              <button className="btn btn-ghost !h-8 !px-3 text-xs">
                <LogOut aria-hidden className="size-3.5" /> Keluar
              </button>
            </form>
          </>
        ) : (
          <Link href="/masuk" className="ml-1 btn btn-ghost !h-8 !px-3 text-xs">
            <LogIn aria-hidden className="size-3.5" /> Masuk
          </Link>
        )}
        {isAdmin && (
          <Link href="/dashboard" className={`${linkClass} ml-2 !text-[var(--gold-2)]`}>
            <LayoutDashboard aria-hidden className={iconClass} /> Dashboard
          </Link>
        )}
      </nav>
      <MobileNav loggedIn={Boolean(customer)} />
    </header>
  );
}
