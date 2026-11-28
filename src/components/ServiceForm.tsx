"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveService, type ActionResult } from "@/app/actions";
import type { PricingMode, Service } from "@/lib/db";

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveService, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pricingModel, setPricingModel] = useState<PricingMode>(
    service?.pricing_model ?? (service?.pricing_mode === "per_unit" ? "per_unit" : "flat"),
  );
  const [category, setCategory] = useState(service?.category ?? "design");

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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label">Kategori</span>
          <select
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="field"
          >
            <option value="design">Desain & branding</option>
            <option value="print">Cetak</option>
            <option value="other">Lainnya / custom</option>
          </select>
          <span className="mt-1.5 block text-xs text-mute">Menentukan kelompok di halaman pesan.</span>
        </label>
        <div className="flex items-end pb-1">
          <label className="block w-full cursor-pointer">
            <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="peer sr-only" />
            <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              <span aria-hidden className="check-box">✓</span>
              <span className="text-sm font-semibold">Tampilkan</span>
            </span>
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="label">Cara harga</legend>
        <div className="flex flex-wrap gap-2">
          {([
            ["flat", "Harga paket"],
            ["per_unit", "Per item"],
            ["area", "Per m² (ukuran)"],
          ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="pricing_model"
                value={value}
                checked={pricingModel === value}
                onChange={() => setPricingModel(value)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center rounded-tag-sm border border-line px-4 text-[13px] font-semibold text-ink/65 transition-colors peer-checked:border-accent/60 peer-checked:bg-accent/15 peer-checked:text-accent">
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">
          {pricingModel === "flat"
            ? "Pelanggan memilih paket/tambahan; harga dasar adalah harga paket."
            : pricingModel === "area"
              ? "Pelanggan mengisi lebar × tinggi (cm). Harga dikali luas m², minimal sesuai kolom minimum."
              : "Pelanggan mengisi jumlah; harga dasar dikali jumlah."}
        </p>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="label">
            {pricingModel === "flat" ? "Harga paket" : pricingModel === "area" ? "Harga per m²" : "Harga per satuan"}
          </span>
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
            {pricingModel === "flat" ? "0 = harga menunggu admin." : "Tanpa titik, misal 25000 = Rp25.000."}
          </span>
        </label>
        <label className="block">
          <span className="label">Minimal order</span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/40">Rp</span>
            <input
              name="min_price"
              inputMode="numeric"
              defaultValue={service?.min_price ?? 0}
              className="field pl-10 tabular-nums"
            />
          </span>
          <span className="mt-1.5 block text-xs text-mute">0 = tanpa minimum.</span>
        </label>
        <label className="block">
          <span className="label">Pembulatan</span>
          <input
            name="round_to"
            inputMode="numeric"
            defaultValue={service?.round_to ?? 0}
            className="field tabular-nums"
          />
          <span className="mt-1.5 block text-xs text-mute">Misal 1000 = bulatkan ke atas per Rp1.000.</span>
        </label>
      </div>

      {pricingModel === "per_unit" && (
        <div className="grid gap-5 rounded-tag-sm border border-line bg-panel/40 p-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Nama satuan</span>
            <input name="unit_label" defaultValue={service?.unit_label || ""} placeholder="lembar / box" className="field" required />
            <span className="mt-1.5 block text-xs text-mute">Tampil di form: “Jumlah (lembar)”.</span>
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

      {pricingModel === "area" && (
        <label className="block max-w-xs">
          <span className="label">Luas minimum (m²)</span>
          <input
            name="min_area_m2"
            inputMode="decimal"
            step="any"
            defaultValue={service?.min_area_m2 ?? 1}
            className="field tabular-nums"
          />
          <span className="mt-1.5 block text-xs text-mute">Spanduk 30×30 cm tetap dihitung 1 m².</span>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block cursor-pointer">
          <input type="checkbox" name="requires_file" defaultChecked={service?.requires_file ?? false} className="peer sr-only" />
          <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            <span aria-hidden className="check-box">✓</span>
            <span>
              <span className="block text-sm font-semibold">Wajib link file</span>
              <span className="block text-xs text-mute">Untuk produk cetak.</span>
            </span>
          </span>
        </label>
        <label className="block">
          <span className="label">Urutan</span>
          <input name="sort" inputMode="numeric" defaultValue={service?.sort ?? 0} className="field tabular-nums" />
          <span className="mt-1.5 block text-xs text-mute">Kecil ke besar.</span>
        </label>
      </div>

      <label className="block">
        <span className="label">Catatan harga</span>
        <textarea
          name="price_note"
          rows={2}
          defaultValue={service?.price_note}
          placeholder="Contoh: harga per m², minimal 1 m², sudah termasuk cetak full color."
          className="field resize-y"
        />
      </label>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className="btn btn-primary min-h-12 px-5 text-sm">
          {pending ? "Menyimpan…" : edit ? "Simpan layanan" : "Tambah layanan"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-medium text-ink">{edit ? "Tersimpan." : "Layanan ditambahkan."}</span>}
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
