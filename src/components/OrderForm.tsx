"use client";

import { useActionState } from "react";
import { createOrder } from "@/app/actions";
import type { Service } from "@/lib/db";
import { rupiah } from "@/lib/format";

export function OrderForm({ services, preselect }: { services: Service[]; preselect?: string }) {
  const [state, action, pending] = useActionState(createOrder, null);
  const v = state?.values ?? {};
  const chosen = v.service ?? preselect;

  return (
    <form action={action} className="space-y-10">
      <fieldset>
        <legend className="mb-4 text-xl font-bold tracking-tight">Layanan apa yang kamu butuhkan?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="block cursor-pointer">
              <input type="radio" name="service" value={s.id} defaultChecked={chosen === s.id} className="peer sr-only" required />
              <div className="h-full rounded-tag-sm border border-line p-4 transition-colors hover:border-white peer-checked:border-white peer-checked:bg-white peer-checked:text-black peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
                <p className="font-bold">{s.name}</p>
                <p className="mt-1 text-sm opacity-60">
                  {s.price_from ? `Mulai ${rupiah(s.price_from)}` : "Harga sesuai brief"} · sekitar {s.days} hari
                </p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-soft">Nama</span>
          <input name="name" defaultValue={v.name} autoComplete="name" className="field" required />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-soft">Nomor WhatsApp</span>
          <input name="wa" defaultValue={v.wa} inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" className="field" required />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-soft">Brief</span>
        <textarea name="brief" defaultValue={v.brief} rows={6} className="field resize-y" required
          placeholder="Untuk apa desainnya, siapa yang akan melihat, dan gaya yang kamu suka. Belum punya ide juga tidak apa-apa." />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-soft">Link referensi (opsional)</span>
          <input name="ref" type="url" defaultValue={v.ref} placeholder="https://" className="field" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-soft">Butuh selesai tanggal (opsional)</span>
          <input name="deadline" type="date" defaultValue={v.deadline} className="field [color-scheme:dark]" />
        </label>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-tag-sm border border-[#ff5d5d] px-4 py-3 text-[#ff5d5d]">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-solid">
          {pending ? "Mengirim..." : "Kirim pesanan"}
        </button>
        <p className="text-sm text-mute">Konfirmasi dan harga final dikabari lewat WhatsApp.</p>
      </div>
    </form>
  );
}
