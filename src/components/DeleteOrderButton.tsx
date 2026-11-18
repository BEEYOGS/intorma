"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteOrder, type ActionResult } from "@/app/actions";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirm, setConfirm] = useState("");
  const matched = confirm.trim().toUpperCase() === code;

  useEffect(() => {
    if (state?.error && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [state]);

  function open() {
    setConfirm("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-tag-sm border border-[#c0392b]/35 px-4 text-sm font-semibold text-[#e98078] transition-colors hover:border-[#c0392b] hover:bg-[#c0392b]/10"
      >
        Hapus pesanan
        <span aria-hidden="true">→</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`hapus-${id}`}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="w-[min(92vw,28rem)] rounded-tag-lg border border-line bg-panel p-0 text-ink shadow-2xl"
      >
        <div className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e98078]">Zona berbahaya</p>
          <h3 id={`hapus-${id}`} className="mt-3 text-xl font-semibold tracking-tight">
            Hapus pesanan {code}?
          </h3>
          <p className="mt-2 text-sm leading-6 text-mute">
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
              <p role="alert" className="rounded-tag-sm border border-[#c0392b]/35 bg-[#c0392b]/10 px-3 py-2 text-sm text-[#e98078]">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={close} className="btn-ghost min-h-10 px-4 text-sm">
                Batal
              </button>
              <button
                type="submit"
                disabled={pending || !matched}
                className="inline-flex min-h-10 items-center justify-center rounded-tag-sm bg-[#c0392b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a93226] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Menghapus…" : "Ya, hapus pesanan"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
