"use client";

import { useActionState, useEffect, useState } from "react";
import { bulkUpdateOrders, type ActionResult } from "@/app/actions";
import { STATUSES, STATUS_META } from "@/lib/status";

const CODE_PATTERN = /^INT-(\d{9,}|[A-Z0-9]{6})$/;

function parseCodes(raw: string): { valid: string[]; invalid: string[] } {
  const entries = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    const normalized = `INT-${entry.toUpperCase().replace(/^INT-?/, "").replace(/-/g, "")}`;
    if (CODE_PATTERN.test(normalized)) {
      if (!valid.includes(normalized)) valid.push(normalized);
    } else {
      invalid.push(entry);
    }
  }
  return { valid, invalid };
}

export function BulkOrderForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(bulkUpdateOrders, null);
  const [codes, setCodes] = useState("");
  const parsed = parseCodes(codes);

  useEffect(() => {
    const onCodes = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") setCodes(detail);
    };
    window.addEventListener("intorma:bulk-codes", onCodes);
    return () => window.removeEventListener("intorma:bulk-codes", onCodes);
  }, []);

  return (
    <details className="rounded-tag-lg border border-line bg-panel/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Aksi massal</summary>
      <form action={action} className="mt-4 grid gap-3">
        <label className="block">
          <span className="label">Kode pesanan (satu per baris atau dipisah koma)</span>
          <textarea
            name="codes"
            value={codes}
            onChange={(event) => setCodes(event.target.value)}
            rows={4}
            className="field resize-y font-mono text-xs"
            placeholder="INT-251126001&#10;INT-251126002"
            required
            aria-describedby="bulk-code-hint"
          />
          <span id="bulk-code-hint" aria-live="polite" className="mt-1 block text-xs text-[var(--text-3)]">
            {codes.trim()
              ? `${parsed.valid.length} kode valid${parsed.invalid.length ? ` · ${parsed.invalid.length} ditolak: ${parsed.invalid.slice(0, 3).join(", ")}${parsed.invalid.length > 3 ? "…" : ""}` : ""}`
              : "Satu kode per baris atau dipisah koma."}
          </span>
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
          <button type="submit" disabled={pending || parsed.valid.length === 0} className="btn btn-primary min-h-10 px-4 text-sm">
            {pending ? "Memproses…" : "Terapkan"}
          </button>
          {state?.ok && <span className="text-sm font-medium text-ink">Berhasil diperbarui.</span>}
          {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}