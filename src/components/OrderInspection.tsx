"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Inspeksi pesanan: bottom sheet di mobile, drawer samping di desktop.
 * Detail dirender sebagai children supaya server component tetap bisa dipakai.
 */
export function OrderInspection({
  code,
  trigger,
  initialOpen = false,
  closeHref,
  children,
}: {
  code: string;
  trigger: ReactNode;
  initialOpen?: boolean;
  closeHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (initialOpen) router.replace(closeHref, { scroll: false });
  }, [closeHref, initialOpen, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [close, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={`Inspeksi pesanan ${code}`}
        className="block w-full"
      >
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
          <button
            type="button"
            aria-label="Tutup inspeksi"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inspection-${code}`}
            tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[12px] border border-line bg-[var(--bg)] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] outline-none sm:h-dvh sm:max-h-none sm:w-[min(34rem,100vw)] sm:rounded-l-[12px] sm:rounded-tr-none"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="eyebrow">Inspeksi pesanan</p>
                <h2 id={`inspection-${code}`} className="mono mt-0.5 truncate text-sm font-semibold tracking-wide">
                  {code}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup inspeksi"
                className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sharp)] text-ink/50 transition-colors hover:bg-white/[0.06] hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pt-5 sm:px-5">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
