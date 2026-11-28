"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrder, type ActionResult } from "@/app/actions";
import { MobileSheet } from "@/components/MobileSheet";
import { useIsMobile } from "@/hooks/useIsMobile";

export function DeleteOrderButton({
  id,
  code,
  name,
  returnTo,
}: {
  id: number;
  code: string;
  name: string;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(deleteOrder, null);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const matched = confirm.trim().toUpperCase() === code;

  useEffect(() => {
    if (state?.error) setOpen(true);
  }, [state]);

  function openDialog() {
    setConfirm("");
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-12 items-center gap-2 rounded-tag-sm border border-danger/35 px-4 text-sm font-semibold text-danger transition-colors hover:border-danger hover:bg-danger/10 sm:min-h-10"
      >
        <Trash2 aria-hidden className="size-4" /> Hapus pesanan
      </button>

      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        side={isMobile ? "bottom" : "right"}
        titleId={`hapus-${id}`}
        header={
          <header className="border-b border-[var(--border)] px-5 pb-3 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger">Zona berbahaya</p>
            <h3 id={`hapus-${id}`} className="mt-2 text-xl font-semibold tracking-tight">
              Hapus pesanan {code}?
            </h3>
          </header>
        }
      >
        <p className="text-sm leading-6 text-mute">
          Pesanan atas nama <span className="font-medium text-ink/80">{name}</span> beserta seluruh
          riwayat statusnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>

        <form action={action} className="mt-5 grid gap-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="block">
            <span className="label">
              Ketik <span className="font-mono text-ink">{code}</span> untuk konfirmasi
            </span>
            <input
              name="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={code}
              className="field font-mono uppercase tracking-wide"
              required
            />
          </label>

          {state?.error && (
            <p role="alert" className="rounded-tag-sm border border-danger/35 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10">
              Batal
            </button>
            <button
              type="submit"
              disabled={pending || !matched}
              className="inline-flex min-h-12 items-center justify-center rounded-tag-sm bg-danger px-4 text-sm font-semibold text-[#1a0505] transition-colors hover:bg-[#ff8585] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-10"
            >
              {pending ? "Menghapus…" : "Ya, hapus pesanan"}
            </button>
          </div>
        </form>
      </MobileSheet>
    </>
  );
}
