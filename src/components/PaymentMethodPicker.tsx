"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { chargePayment, type ActionResult } from "@/app/actions";
import { PaymentLogo } from "@/components/PaymentLogo";
import type { PaymentMethodMeta } from "@/lib/payment";

export function PaymentMethodPicker({
  code,
  methods,
  accessToken,
}: {
  code: string;
  methods: PaymentMethodMeta[];
  accessToken?: string | null;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(chargePayment, null);
  const [selected, setSelected] = useState<string>(methods[0]?.id ?? "qris");
  const current = methods.find((item) => item.id === selected) ?? methods[0];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("intorma-last-payment-method");
      if (saved && methods.some((method) => method.id === saved)) setSelected(saved);
    } catch {
      // Abaikan kegagalan penyimpanan.
    }
  }, [methods]);

  useEffect(() => {
    try {
      window.localStorage.setItem("intorma-last-payment-method", selected);
    } catch {
      // Abaikan kegagalan penyimpanan.
    }
  }, [selected]);

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="method" value={selected} />
      {accessToken ? <input type="hidden" name="accessToken" value={accessToken} /> : null}

      <div role="radiogroup" aria-label="Metode pembayaran" className="grid gap-2">
        {methods.map((method) => {
          const active = method.id === selected;
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(method.id)}
              className={`flex min-h-12 items-center gap-3 rounded-tag-sm border px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-accent/60 bg-accent/[0.07]"
                  : "border-line bg-panel/40 hover:border-[var(--border-2)]"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-[6px] border bg-white p-1 ${
                  active ? "border-accent/60" : "border-line"
                }`}
              >
                <PaymentLogo method={method} />
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

      <button type="submit" disabled={pending} className="btn btn-primary mt-4 min-h-12 w-full px-4 text-sm">
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
      <p className="mt-3 text-center text-xs leading-5 text-mute">
        Tagihan berlaku 60 menit. Status pesanan berubah otomatis setelah pembayaran terverifikasi.
      </p>
    </form>
  );
}
