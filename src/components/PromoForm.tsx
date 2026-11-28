"use client";

import { useActionState, useState } from "react";
import { createPromo } from "@/app/actions";
import { rupiah } from "@/lib/format";

function tanggalCepat(hari: number) {
  const now = new Date(Date.now() + hari * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function PromoForm() {
  const [state, action, pending] = useActionState(createPromo, null);
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const base = Math.max(100000, Number(minOrder) || 0);
  const raw = Number(value) || 0;
  let discount = type === "percent" ? Math.round((base * raw) / 100) : Math.round(raw);
  if (type === "percent" && maxDiscount) discount = Math.min(discount, Number(maxDiscount) || 0);
  discount = Math.max(0, Math.min(discount, base));

  return (
    <div className="grid gap-5">
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label">Kode</span>
          <input name="code" required className="field uppercase" placeholder="DISKON10" />
        </label>
        <label className="block">
          <span className="label">Tipe</span>
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="field cursor-pointer"
          >
            <option value="percent">Persen</option>
            <option value="fixed">Nominal (Rp)</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Nilai</span>
          <input
            name="value"
            type="number"
            min="1"
            required
            className="field"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="10"
          />
        </label>
        <label className="block">
          <span className="label">Min. order (Rp)</span>
          <input
            name="minOrder"
            type="number"
            min="0"
            className="field"
            value={minOrder}
            onChange={(event) => setMinOrder(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Maks. diskon (Rp, opsional)</span>
          <input
            name="maxDiscount"
            type="number"
            min="0"
            className="field"
            value={maxDiscount}
            onChange={(event) => setMaxDiscount(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Batas pemakaian (opsional)</span>
          <input name="usageLimit" type="number" min="1" className="field" />
        </label>
        <label className="block">
          <span className="label">Kedaluwarsa (opsional)</span>
          <input
            name="expiresAt"
            type="date"
            className="field"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {[7, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setExpiresAt(tanggalCepat(days))}
                className="inline-flex min-h-10 items-center rounded-tag-sm border border-line px-2.5 text-xs text-mute transition-colors hover:text-[var(--text)]"
              >
                +{days} hari
              </button>
            ))}
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt("")}
                className="inline-flex min-h-10 items-center px-2 text-xs text-mute underline underline-offset-4"
              >
                Hapus
              </button>
            )}
          </span>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={pending} className="btn btn-primary min-h-10 px-4 text-sm">
            {pending ? "Menyimpan…" : "Buat kode"}
          </button>
          {state?.ok && <span className="text-sm font-medium text-ink">Tersimpan.</span>}
          {state?.error && <span className="text-sm text-danger">{state.error}</span>}
        </div>
      </form>

      <div className="rounded-tag-sm border border-line bg-panel/40 p-4" aria-live="polite">
        <p className="eyebrow">Simulasi cepat</p>
        <p className="mt-2 text-xs text-mute">Contoh pesanan {rupiah(base)} membrane diskon {type === "percent" ? `${raw}%` : rupiah(raw)}.</p>
        <p className="mono mt-2 text-lg font-semibold tabular-nums">
          {rupiah(base)} <span aria-hidden className="text-mute">→</span>{" "}
          <span className="text-accent">{rupiah(base - discount)}</span>
        </p>
        <p className="mt-1 text-xs text-mute">
          Hemat {rupiah(discount)}
          {type === "percent" && maxDiscount ? " · dibatasi maks. diskon" : ""}
          {expiresAt ? ` · berlaku sampai ${expiresAt}` : " · tanpa batas tanggal"}.
        </p>
      </div>
    </div>
  );
}
