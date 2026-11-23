import Link from "next/link";
import { TopBar } from "@/components/TopBar";

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
          <a href="https://wa.me/6289617607952" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text)]">
            WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-[var(--text-2)]">
      <span aria-hidden className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-2)]">
      <span aria-hidden className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}
