import type { ReactNode } from "react";

/**
 * Ritme state yang sama untuk katalog, portal, dan pustaka file:
 * satu kalimat jelas + satu aksi utama. Tidak ada warna dekoratif.
 */
export function EmptyState({
  title,
  description,
  action,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-tag-lg border border-dashed border-line bg-panel/40 text-center ${
        compact ? "p-6" : "p-8 sm:p-10"
      }`}
      role="status"
    >
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description && <p className="mt-1 text-xs leading-5 text-mute">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-tag-lg border border-danger/35 bg-danger/[0.06] p-6 text-center">
      <p className="text-sm font-semibold text-danger">{title}</p>
      {description && <p className="mt-1 text-xs leading-5 text-mute">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Memuat…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="p-8 text-center">
      <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="mt-3 text-xs text-mute">{label}</p>
    </div>
  );
}
