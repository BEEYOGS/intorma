"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";

/**
 * Inspeksi pesanan: bottom sheet dengan geser-tutup di mobile, drawer samping
 * di desktop. Detail dirender sebagai children supaya server component tetap
 * bisa dipakai.
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

  const close = useCallback(() => {
    setOpen(false);
    if (initialOpen) router.replace(closeHref, { scroll: false });
  }, [closeHref, initialOpen, router]);

  const titleId = `inspection-${code}`;

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

      <MobileSheet
        open={open}
        onClose={close}
        side="right"
        titleId={titleId}
        header={
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="eyebrow">Inspeksi pesanan</p>
              <h2 id={titleId} className="mono mt-0.5 truncate text-sm font-semibold tracking-wide">
                {code}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Tutup inspeksi"
              className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] text-ink/50 transition-colors hover:bg-white/[0.06] hover:text-ink sm:size-10"
            >
              <X aria-hidden className="size-4" />
            </button>
          </header>
        }
      >
        {children}
      </MobileSheet>
    </>
  );
}
