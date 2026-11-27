"use client";

import { useActionState } from "react";
import { saveCustomerProfile, type ActionResult } from "@/app/actions";
import type { Customer } from "@/lib/customer-auth";

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveCustomerProfile, null);
  return (
    <form action={action} className="grid gap-4">
      <label className="block">
        <span className="label">Nama</span>
        <input name="name" defaultValue={customer.name} className="input" required />
      </label>
      <label className="block">
        <span className="label">WhatsApp</span>
        <input name="wa" defaultValue={customer.wa} inputMode="tel" className="input" required />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" defaultValue={customer.email} className="input" required />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary !h-10 text-xs">
          {pending ? "Menyimpan…" : "Simpan profil"}
        </button>
        {state?.ok && <span role="status" className="text-xs text-mute">Tersimpan.</span>}
        {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
