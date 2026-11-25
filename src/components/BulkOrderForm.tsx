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
            placeholder="INT-XXXXXX&#10;INT-YYYYYY"
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
          <label className="flex cursor-pointer items-center gap-3 pt-6">
            <input type="checkbox" name="paid" className="peer sr-only" />
            <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              <span aria-hidden className="check-box">✓</span>
              <span className="text-sm font-semibold">Tandai lunas</span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary min-h-10 px-4 text-sm">
            {pending ? "Memproses…" : "Terapkan"}
          </button>
          {state?.ok && <span className="text-sm font-medium text-ink">Berhasil diperbarui.</span>}
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}