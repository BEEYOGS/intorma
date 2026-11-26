"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Landmark, Loader2, QrCode } from "lucide-react";
import { chargePayment, type ActionResult } from "@/app/actions";
import type { PaymentMethodMeta } from "@/lib/payment";

export function PaymentMethodPicker({
  code,
  methods,
}: {
  code: string;
  methods: PaymentMethodMeta[];
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(chargePayment, null);
  const [selected, setSelected] = useState(methods[0]?.id ?? "qris");
  const current = methods.find((item) => item.id === selected) ?? methods[0];

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="method" value={selected} />

      <div role="radiogroup" aria-label="Metode pembayaran" className="grid gap-2">
        {methods.map((method) => {
          const active = method.id === selected;
          const Icon = method.kind === "qris" ? QrCode : Landmark;
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(method.id)}
              className={`flex items-center gap-3 rounded-tag-sm border px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-accent/60 bg-accent/[0.07]"
                  : "border-line bg-panel/40 hover:border-[var(--border-2)]"
              }`}
            >
              <span
                aria-hidden
                className={`grid size-9 shrink-0 place-items-center rounded-[6px] border ${
                  active ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-mute"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{method.label}</span>
                <span className="mt-0.5 block truncate text-xs text-mute">{method.hint}</span>
              </span>
              <span
                aria-hidden
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                  active ? "border-accent" : "border-[var(--border-2)]"
                }`}
              >
                {active && <span className="size-2 rounded-full bg-accent" />}
              </span>
            </button>
          );
        })}
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary mt-4 min-h-11 w-full px-4 text-sm">
        {pending ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Menyiapkan tagihan…
          </>
        ) : (
          <>
            Lanjut dengan {current?.label ?? "QRIS"}
            <ArrowRight aria-hidden className="size-4" />
          </>
        )}
      </button>

      {state?.error && (
        <p role="alert" className="mt-3 rounded-tag-sm border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs leading-5 text-danger">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-center text-[11px] leading-5 text-mute">
        Tagihan berlaku 60 menit. Status pesanan berubah otomatis setelah pembayaran terverifikasi.
      </p>
    </form>
  );
}
