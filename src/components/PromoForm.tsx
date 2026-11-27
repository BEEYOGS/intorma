"use client";

import { useActionState } from "react";
import { createPromo } from "@/app/actions";

export function PromoForm() {
  const [state, action, pending] = useActionState(createPromo, null);
  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block">
        <span className="label">Kode</span>
        <input name="code" required className="field uppercase" placeholder="DISKON10" />
      </label>
      <label className="block">
        <span className="label">Tipe</span>
        <select name="type" className="field cursor-pointer" defaultValue="percent">
          <option value="percent">Persen</option>
          <option value="fixed">Nominal (Rp)</option>
        </select>
      </label>
      <label className="block">
        <span className="label">Nilai</span>
        <input name="value" type="number" min="1" required className="field" placeholder="10" />
      </label>
      <label className="block">
        <span className="label">Min. order (Rp)</span>
        <input name="minOrder" type="number" min="0" defaultValue="0" className="field" />
      </label>
      <label className="block">
        <span className="label">Maks. diskon (Rp, opsional)</span>
        <input name="maxDiscount" type="number" min="0" className="field" />
      </label>
      <label className="block">
        <span className="label">Batas pemakaian (opsional)</span>
        <input name="usageLimit" type="number" min="1" className="field" />
      </label>
      <label className="block">
        <span className="label">Kedaluwarsa (opsional)</span>
        <input name="expiresAt" type="date" className="field" />
      </label>
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary min-h-10 px-4 text-sm">
          {pending ? "Menyimpan…" : "Buat kode"}
        </button>
        {state?.ok && <span className="text-sm font-medium text-ink">Tersimpan.</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
