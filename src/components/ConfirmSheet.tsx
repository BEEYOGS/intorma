"use client";

import { useCallback, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";

/**
 * Konfirmasi destruktif yang konsisten di mobile (bottom sheet) dan desktop
 * (drawer kanan). Tidak memakai window.confirm agar fokus, Escape, dan
 * restore fokus bisa diatur sepenuhnya oleh aplikasi.
 */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  children,
  initialFocusSelector,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  children?: ReactNode;
  initialFocusSelector?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const close = useCallback(() => {
    if (!pending) onClose();
  }, [onClose, pending]);

  return (
    <MobileSheet
      open={open}
      onClose={close}
      side="right"
      titleId={titleId}
      descriptionId={descriptionId}
      initialFocusSelector={initialFocusSelector}
      panelClassName="sm:w-[min(28rem,100vw)]"
      bodyClassName="!pt-4"
      header={
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-2 sm:px-5">
          <div className="min-w-0">
            <p className="eyebrow">Konfirmasi</p>
            <h2 id={titleId} className="mt-1 text-base font-semibold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            aria-label="Batal dan tutup"
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-line text-[var(--text-2)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>
      }
    >
      <p id={descriptionId} className="text-sm leading-6 text-[var(--text-2)]">
        {description}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-tag-sm border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={close} disabled={pending} className="btn btn-ghost min-h-12 px-4 text-sm">
          Batal
        </button>
        <button
          type="button"
          data-confirm
          onClick={onConfirm}
          disabled={pending}
          className="btn btn-danger min-h-12 px-4 text-sm"
        >
          {pending ? "Memproses…" : confirmLabel}
        </button>
      </div>
    </MobileSheet>
  );
}
