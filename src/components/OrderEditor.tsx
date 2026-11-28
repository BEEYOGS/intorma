"use client";

import { useActionState, useEffect, type CSSProperties } from "react";
import { toast } from "@/components/Toast";
import { updateOrder, type ActionResult } from "@/app/actions";
import { rupiah } from "@/lib/format";
import { priceBreakdown } from "@/lib/pricing";
import { IconForStatus } from "@/components/StatusIcon";
import { STATUSES, STATUS_META, type Status } from "@/lib/status";

type Order = {
  id: number;
  status: string;
  price: number | null;
  note: string | null;
  internalNote: string | null;
  proofUrl: string | null;
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

  useEffect(() => {
    if (state?.ok) toast("Perubahan pesanan tersimpan.", "ok");
    if (state?.error) toast(state.error, "error");
  }, [state]);
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
              <span
                className="inline-flex min-h-12 items-center gap-2 rounded-tag-sm border border-line bg-panel/60 px-3 py-2 text-[13px] font-semibold text-ink/70 transition-colors peer-checked:[color:var(--status-color)] peer-checked:[border-color:var(--status-border)] peer-checked:[background:var(--status-soft)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                style={
                  {
                    "--status-color": STATUS_META[s].color,
                    "--status-border": `color-mix(in srgb, ${STATUS_META[s].color} 45%, transparent)`,
                    "--status-soft": STATUS_META[s].soft,
                  } as CSSProperties
                }
              >
                <IconForStatus status={s} className="size-3.5" />
                {STATUS_META[s].short}
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
        <span className="mt-1.5 block text-xs text-mute">Ikut dikirim saat “Kabari klien” dicentang.</span>
      </label>

      <label className="mt-5 block">
        <span className="label flex flex-wrap items-center gap-2">
          Catatan internal
          <span className="rounded-tag-sm border border-line px-2 py-1 text-xs font-semibold uppercase tracking-wider text-mute">
            Admin saja
          </span>
        </span>
        <textarea
          name="internalNote"
          rows={2}
          defaultValue={order.internalNote ?? ""}
          className="field resize-y"
          placeholder="Contoh: desainer slot A, stok habis, tunggu konfirmasi supplier."
        />
        <span className="mt-1.5 block text-xs text-mute">Tidak pernah dikirim ke klien, termasuk lewat WhatsApp.</span>
      </label>

      <label className="mt-5 block">
        <span className="label">Link bukti transfer (opsional)</span>
        <input
          name="proofUrl"
          type="url"
          defaultValue={order.proofUrl ?? ""}
          className="field"
          placeholder="https://…"
        />
        <span className="mt-1.5 block text-xs text-mute">
          Isi kalau bukti transfer tersimpan di Drive atau tempat lain. Kosongkan untuk menghapus tautan lama.
        </span>
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
          <input type="checkbox" name="notify" className="peer sr-only" />
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
        <button type="submit" disabled={pending} className="btn btn-primary min-h-12 px-5 text-sm">
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        {state?.ok && <span role="status" className="text-sm font-medium text-ink">Tersimpan.</span>}
        {state?.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
