"use client";

import { useActionState } from "react";
import { updateOrder, type ActionResult } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { priceBreakdown } from "@/lib/pricing";
import { STATUSES, STATUS_META, type Status } from "@/lib/status";

type Order = {
  id: number;
  status: string;
  price: number | null;
  note: string | null;
  paid: boolean;
  qty: number | null;
  unitRate: number | null;
  unitLabel: string;
};

export function OrderEditor({
  order,
  servicePrice,
  returnTo,
}: {
  order: Order;
  servicePrice: number | null;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateOrder, null);
  const status = (STATUSES as readonly string[]).includes(order.status) ? (order.status as Status) : "menunggu";

  return (
    <form action={action} className="rounded-tag-lg border border-line bg-panel/60 p-5">
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <fieldset>
        <legend className="label">Status pesanan</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="radio" name="status" value={s} defaultChecked={status === s} className="peer sr-only" />
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-2 text-[12.5px] font-semibold text-ink/70 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                <span aria-hidden className="status-dot" style={{ background: STATUS_META[s].color }} />
                {STATUS_META[s].label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)]">
        <label className="block">
          <span className="label">Harga total</span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/40">
              Rp
            </span>
            <input
              name="price"
              inputMode="numeric"
              defaultValue={order.price ?? ""}
              placeholder="0"
              className="field pl-10 font-semibold tabular-nums"
            />
          </span>
          <span className="mt-1.5 block text-xs text-mute">
            {servicePrice ? `Harga layanan: ${rupiah(servicePrice)} — boleh disesuaikan dengan kesepakatan.` : "Kosongkan kalau harga belum disepakati."}
          </span>
          {priceBreakdown(order.price, order.qty, order.unitRate, order.unitLabel, rupiah) && (
            <span className="mt-1 block text-xs font-medium text-ink/75">
              Dihitung otomatis: {priceBreakdown(order.price, order.qty, order.unitRate, order.unitLabel, rupiah)}
            </span>
          )}
        </label>
      </div>

      <label className="mt-5 block">
        <span className="label">Catatan untuk klien</span>
        <textarea
          name="note"
          rows={2}
          defaultValue={order.note ?? ""}
          className="field resize-y"
          placeholder="Contoh: revisi 1 sudah masuk, file dikirim Jumat."
        />
      </label>

      <div className="mt-5 grid gap-3">
        <label className="block cursor-pointer">
          <input type="checkbox" name="paid" defaultChecked={order.paid} className="peer sr-only" />
          <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
            <span aria-hidden className="check-box">✓</span>
            <span>
              <span className="block text-sm font-semibold">Pembayaran sudah masuk</span>
              <span className="block text-xs text-mute">Centang setelah transfer terverifikasi.</span>
            </span>
          </span>
        </label>

        <label className="block cursor-pointer">
          <input type="checkbox" name="notify" defaultChecked className="peer sr-only" />
          <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
            <span aria-hidden className="check-box">✓</span>
            <span>
              <span className="block text-sm font-semibold">Kabari klien lewat WhatsApp</span>
              <span className="block text-xs text-mute">Pesan otomatis berisi status, harga, dan catatan.</span>
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
        <button type="submit" disabled={pending} className="btn-primary min-h-11 px-5 text-sm">
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-medium text-[#1f7a4d]">Tersimpan.</span>}
        {state?.error && <span role="alert" className="text-sm text-[#8f2b20]">{state.error}</span>}
      </div>
    </form>
  );
}
