"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { lookupOrder } from "@/app/actions";

export function LacakForm() {
  const [state, action, pending] = useActionState(lookupOrder, null);
  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Cek status</h2>
        <span className="tag border-accent/25 text-accent">Live</span>
      </div>
      <form action={action} className="mt-6 grid gap-5">
        <label className="block">
          <span className="label">Kode pesanan</span>
          <input
            name="kode"
            placeholder="INT-251126001"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="field font-mono text-[15px] font-semibold uppercase tracking-[0.16em]"
            required
          />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-tag-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? "Mencari…" : "Lihat pesanan"}
          {!pending && <ArrowRight aria-hidden className="size-4" />}
        </button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
        Halaman ini hanya menampilkan data pesanan, bukan data pembayaran sensitif. Jangan bagikan
        kode pesanan ke orang lain.
      </p>
    </div>
  );
}
