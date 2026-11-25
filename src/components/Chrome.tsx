import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { IconForStatus } from "@/components/StatusIcon";
import { STATUS_META, type Status } from "@/lib/status";

export function Nav() {
  return <TopBar />;
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="wrap flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-[var(--text-3)]">
        <span className="mono">in.torma — Creative without idea</span>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/order" className="transition-colors hover:text-[var(--text)]">Pesan</Link>
          <Link href="/lacak" className="transition-colors hover:text-[var(--text)]">Lacak</Link>
          <WhatsAppLink
            text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--text)]"
          >
            <WhatsAppIcon aria-hidden className="size-3.5" /> WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </footer>
  );
}

export function StatusDot({
  color,
  label,
  status,
}: {
  color: string;
  label: string;
  status?: Status;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-[var(--text-2)]">
      <span aria-hidden className="status-dot" style={{ background: color }} />
      {status ? <IconForStatus status={status} className="size-3.5" /> : null}
      {label}
    </span>
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
      className="animate-in inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold"
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
