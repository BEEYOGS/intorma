"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteService, type ActionResult } from "@/app/actions";

export function DeleteServiceButton({
  id,
  name,
  orders,
}: {
  id: string;
  name: string;
  orders: number;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(deleteService, null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirm, setConfirm] = useState("");
  const matched = confirm.trim().toLowerCase() === id.toLowerCase();

  useEffect(() => {
    if (state?.error && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirm("");
          dialogRef.current?.showModal();
        }}
        aria-label={`Hapus layanan ${name}`}
        className="inline-flex min-h-10 items-center gap-2 rounded-tag-sm border border-danger/30 px-3 text-xs font-semibold text-danger transition-colors hover:border-danger hover:bg-danger/10"
      >
        <Trash2 aria-hidden className="size-3.5" /> Hapus
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`hapus-layanan-${id}`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
        className="w-[min(92vw,28rem)] rounded-tag-lg border border-line bg-panel p-0 text-ink shadow-2xl"
      >
        <div className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger">Zona berbahaya</p>
          <h3 id={`hapus-layanan-${id}`} className="mt-3 text-xl font-semibold tracking-tight">
            Hapus layanan {name}?
          </h3>
          <p className="mt-2 text-sm leading-6 text-mute">
            Layanan beserta semua grup dan opsi harganya akan dihapus permanen.
            {orders > 0
              ? ` ${orders} pesanan lama tetap tersimpan dengan nama layanan "${name}", hanya tautannya yang dilepas.`
              : " Belum ada pesanan yang memakai layanan ini."}
          </p>

          <form action={action} className="mt-5 grid gap-4">
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="label">
                Ketik <span className="font-mono text-ink">{id}</span> untuk konfirmasi
              </span>
              <input
                name="confirm"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={id}
                className="field font-mono tracking-wide"
                required
              />
            </label>

            {state?.error && (
              <p role="alert" className="rounded-tag-sm border border-danger/35 bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={() => dialogRef.current?.close()} className="btn-ghost min-h-10 px-4 text-sm">
                Batal
              </button>
              <button
                type="submit"
                disabled={pending || !matched}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-tag-sm bg-danger px-4 text-sm font-semibold text-[#1a0505] transition-colors hover:bg-[#ff8585] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 aria-hidden className="size-4" />
                {pending ? "Menghapus…" : "Ya, hapus layanan"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
