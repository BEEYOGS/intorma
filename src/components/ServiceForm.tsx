"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveService, type ActionResult } from "@/app/actions";
import type { Service } from "@/lib/db";

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveService, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pricingMode, setPricingMode] = useState(service?.pricing_mode ?? "flat");

  useEffect(() => {
    if (state?.reset) formRef.current?.reset();
  }, [state]);

  const edit = Boolean(service);

  return (
    <form ref={formRef} action={action} className="grid gap-5">
      <input type="hidden" name="mode" value={edit ? "edit" : "new"} />
      {edit && <input type="hidden" name="id" value={service!.id} />}

      {edit ? (
        <p className="text-xs text-mute">
          ID: <span className="font-mono text-[12px] text-ink/70">{service!.id}</span>
        </p>
      ) : (
        <label className="block">
          <span className="label">ID layanan</span>
          <input
            name="id"
            required
            pattern="[a-z0-9][a-z0-9-]{1,30}"
            placeholder="misal: kartu-nama"
            className="field font-mono text-sm"
          />
          <span className="mt-1.5 block text-xs text-mute">Huruf kecil, angka, atau tanda hubung. Tidak bisa diubah setelah dibuat.</span>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nama layanan</span>
          <input name="name" required defaultValue={service?.name} placeholder="Logo dan identitas" className="field" />
        </label>
        <label className="block">
          <span className="label">Pengerjaan (hari)</span>
          <input name="days" inputMode="numeric" required defaultValue={service?.days ?? 3} className="field tabular-nums" />
        </label>
      </div>

      <label className="block">
        <span className="label">Deskripsi singkat</span>
        <textarea
          name="blurb"
          required
          rows={2}
          defaultValue={service?.blurb}
          placeholder="Logo, palet warna, dan panduan pemakaian dasar."
          className="field resize-y"
        />
      </label>

      <fieldset>
        <legend className="label">Cara harga</legend>
        <div className="flex flex-wrap gap-2">
          {([
            ["flat", "Harga tetap"],
            ["per_unit", "Dihitung per item"],
          ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="pricing_mode"
                value={value}
                checked={pricingMode === value}
                onChange={() => setPricingMode(value)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center rounded-tag-sm border border-line px-4 text-[13px] font-semibold text-ink/65 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">
          {pricingMode === "per_unit"
            ? "Pelanggan mengisi jumlah; sistem mengalikannya dengan harga satuan di bawah."
            : "Harga tampil sebagai estimasi awal, final dikonfirmasi lewat WhatsApp."}
        </p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="label">{pricingMode === "per_unit" ? "Harga per satuan" : "Harga mulai"}</span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/40">Rp</span>
            <input
              name="price_from"
              inputMode="numeric"
              defaultValue={service?.price_from ?? 0}
              className="field pl-10 tabular-nums"
            />
          </span>
          <span className="mt-1.5 block text-xs text-mute">
            {pricingMode === "per_unit"
              ? "Tanpa titik, misal 25000 = Rp25.000 per satuan."
              : "0 = tampil “sesuai brief”."}
          </span>
        </label>
        <label className="block">
          <span className="label">Urutan</span>
          <input name="sort" inputMode="numeric" defaultValue={service?.sort ?? 0} className="field tabular-nums" />
          <span className="mt-1.5 block text-xs text-mute">Kecil ke besar.</span>
        </label>
        <div className="flex items-end pb-1">
          <label className="block w-full cursor-pointer">
            <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="peer sr-only" />
            <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
              <span aria-hidden className="check-box">✓</span>
              <span className="text-sm font-semibold">Tampilkan</span>
            </span>
          </label>
        </div>
      </div>

      {pricingMode === "per_unit" && (
        <div className="grid gap-5 rounded-tag-lg border border-line bg-panel/40 p-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Nama satuan</span>
            <input name="unit_label" defaultValue={service?.unit_label || ""} placeholder="meter / lembar / box" className="field" required />
            <span className="mt-1.5 block text-xs text-mute">Tampil di form: “Jumlah (meter)”.</span>
          </label>
          <label className="block">
            <span className="label">Minimal</span>
            <input name="min_qty" inputMode="decimal" step="any" defaultValue={service?.min_qty ?? 1} className="field tabular-nums" required />
          </label>
          <label className="block">
            <span className="label">Maksimal</span>
            <input name="max_qty" inputMode="decimal" step="any" defaultValue={service?.max_qty ?? 10000} className="field tabular-nums" required />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className="btn-primary min-h-11 px-5 text-sm">
          {pending ? "Menyimpan…" : edit ? "Simpan layanan" : "Tambah layanan"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-medium text-ink">{edit ? "Tersimpan." : "Layanan ditambahkan."}</span>}
        {state?.error && <span role="alert" className="text-sm text-silver">{state.error}</span>}
      </div>
    </form>
  );
}
