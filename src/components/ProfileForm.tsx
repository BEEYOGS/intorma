"use client";

import { useActionState, useState } from "react";
import { saveCustomerProfile, type ActionResult } from "@/app/actions";
import type { Customer } from "@/lib/customer-auth";

function previewWa(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveCustomerProfile, null);
  const [name, setName] = useState(customer.name);
  const [wa, setWa] = useState(customer.wa);

  return (
    <form action={action} className="grid gap-4">
      <label className="block">
        <span className="label">Nama</span>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="input"
          required
        />
      </label>
      <label className="block">
        <span className="label">WhatsApp</span>
        <input
          name="wa"
          value={wa}
          onChange={(event) => setWa(event.target.value)}
          inputMode="tel"
          className="input"
          required
        />
        <span className="mt-1 block text-xs text-[var(--text-3)]">
          Pratinjau: <span className="font-mono">{previewWa(wa)}</span> · ini hanya bantuan tampilan,
          nilai final tetap mengikuti input kamu.
        </span>
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" defaultValue={customer.email} className="input" required />
      </label>
      <p className="rounded-tag-sm border border-line bg-panel/40 px-3 py-2 text-sm text-[var(--text-2)]">
        Halo, <span className="font-semibold">{name.trim().split(/\s+/)[0] || "kamu"}</span>!
      </p>
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
