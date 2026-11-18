"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveService, type ActionResult } from "@/app/actions";
import type { Service } from "@/lib/db";

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveService, null);
  const formRef = useRef<HTMLFormElement>(null);

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

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="label">Harga mulai</span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/40">Rp</span>
            <input
              name="price_from"
              inputMode="numeric"
              defaultValue={service?.price_from ?? 0}
              className="field pl-10 tabular-nums"
            />
          </span>
          <span className="mt-1.5 block text-xs text-mute">0 = tampil “sesuai brief”.</span>
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className="btn-primary min-h-11 px-5 text-sm">
          {pending ? "Menyimpan…" : edit ? "Simpan layanan" : "Tambah layanan"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-medium text-[#1f7a4d]">{edit ? "Tersimpan." : "Layanan ditambahkan."}</span>}
        {state?.error && <span role="alert" className="text-sm text-[#8f2b20]">{state.error}</span>}
      </div>
    </form>
  );
}
