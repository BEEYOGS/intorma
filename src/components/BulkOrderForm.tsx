"use client";

import { useActionState } from "react";
import { bulkUpdateOrders, type ActionResult } from "@/app/actions";
import { STATUSES, STATUS_META } from "@/lib/status";

export function BulkOrderForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(bulkUpdateOrders, null);

  return (
    <details className="rounded-tag-lg border border-line bg-panel/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Aksi massal</summary>
      <form action={action} className="mt-4 grid gap-3">
        <label className="block">
          <span className="label">Kode pesanan (satu per baris atau dipisah koma)</span>
          <textarea
            name="codes"
            rows={4}
            className="field resize-y font-mono text-xs"
            placeholder="INT-251126001&#10;INT-251126002"
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Status baru (opsional)</span>
            <select name="status" className="field">
              <option value="">— tidak diubah —</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Pembayaran (opsional)</span>
            <select name="paidMode" className="field">
              <option value="">— tidak diubah —</option>
              <option value="paid">Tandai lunas</option>
              <option value="unpaid">Tandai belum dibayar</option>
            </select>
          </label>
        </div>
        <p className="text-xs leading-5 text-mute">
          Perubahan pembayaran otomatis menyamakan catatan transfer, status bayar, dan riwayat pesanan.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary min-h-10 px-4 text-sm">
            {pending ? "Memproses…" : "Terapkan"}
          </button>
          {state?.ok && <span className="text-sm font-medium text-ink">Berhasil diperbarui.</span>}
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}