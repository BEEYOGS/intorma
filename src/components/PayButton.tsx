"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { startPayment, type ActionResult } from "@/app/actions";

export function PayButton({ code, label = "Bayar sekarang" }: { code: string; label?: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(startPayment, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full !h-11 text-sm">
        <CreditCard aria-hidden className={`size-4 ${pending ? "animate-pulse" : ""}`} />
        {pending ? "Membuka pembayaran…" : label}
      </button>
      {state?.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
