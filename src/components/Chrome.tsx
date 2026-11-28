import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { IconForStatus } from "@/components/StatusIcon";
import { STATUS_META, type Status } from "@/lib/status";
import { CONTACT_EMAIL, SITE_NAME, TAGLINE, waDisplay } from "@/lib/site";

export function Nav() {
  return <TopBar />;
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="wrap flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-[var(--text-3)]">
        <span className="mono">{SITE_NAME} — {TAGLINE}</span>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/order" className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">Pesan</Link>
          <Link href="/lacak" className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">Lacak</Link>
          <Link href="/#layanan" className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">Layanan &amp; harga</Link>
          <Link href="/#pembayaran" className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">Pembayaran</Link>
          <Link href="/faq" className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">FAQ</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-12 items-center transition-colors hover:text-[var(--text)]">{CONTACT_EMAIL}</a>
          <WhatsAppLink
            text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
            className="inline-flex min-h-12 items-center gap-1.5 transition-colors hover:text-[var(--text)]"
            title={waDisplay}
          >
            <WhatsAppIcon aria-hidden className="size-3.5" /> WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </footer>
  );
}

export function StatusBadge({
  color,
  label,
  status,
  compact = false,
}: {
  color: string;
  label: string;
  status?: Status;
  compact?: boolean;
}) {
  return (
    <span
      className="animate-in inline-flex items-center gap-1.5 whitespace-nowrap rounded-tag-sm border px-2.5 py-1 text-xs font-semibold"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {status ? (
        <IconForStatus status={status} className="size-3.5" />
      ) : (
        <span aria-hidden className="status-dot !mr-0" style={{ background: color }} />
      )}
      <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
      {compact && <span className="sm:hidden">{status ? STATUS_META[status].short : label}</span>}
    </span>
  );
}
