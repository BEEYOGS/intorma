"use client";

import { useActionState, useState } from "react";
import { saveSettings, type ActionResult } from "@/app/actions";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import type { PaymentSettings } from "@/lib/settings";

export function SettingsForm({ initial, waNumber }: { initial: PaymentSettings; waNumber: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveSettings, null);
  const [form, setForm] = useState(initial);

  const set = (key: keyof PaymentSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-14">
      <form action={action} className="grid gap-6">
        <label className="block cursor-pointer">
          <input
            type="checkbox"
            name="enabled"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="peer sr-only"
          />
          <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
            <span aria-hidden className="check-box">✓</span>
            <span>
              <span className="block text-sm font-semibold">Tampilkan instruksi pembayaran</span>
              <span className="block text-xs text-mute">Muncul di beranda dan halaman lacak pesanan yang sudah punya harga.</span>
            </span>
          </span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Nama bank</span>
            <input name="bankName" value={form.bankName} onChange={set("bankName")} maxLength={40} className="field" placeholder="BCA" />
          </label>
          <label className="block">
            <span className="label">Nomor rekening</span>
            <input
              name="bankAccount"
              value={form.bankAccount}
              onChange={set("bankAccount")}
              maxLength={32}
              inputMode="numeric"
              className="field font-semibold tabular-nums"
              placeholder="1234567890"
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Atas nama</span>
          <input name="bankHolder" value={form.bankHolder} onChange={set("bankHolder")} maxLength={80} className="field" placeholder="Nama pemilik rekening" />
        </label>

        <label className="block">
          <span className="label">Catatan pembayaran</span>
          <textarea
            name="note"
            value={form.note}
            onChange={set("note")}
            rows={3}
            maxLength={300}
            className="field resize-y"
            placeholder="Transfer sesuai total, lalu konfirmasi lewat WhatsApp."
          />
          <span className="mt-1.5 block text-xs text-mute">Dikirim juga di pesan WhatsApp saat harga pesanan dikonfirmasi.</span>
        </label>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
          <button type="submit" disabled={pending} className="btn-primary min-h-11 px-5 text-sm">
            {pending ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
          {state?.ok && <span role="status" className="text-sm font-medium text-ink">Tersimpan.</span>}
          {state?.error && <span role="alert" className="text-sm text-silver">{state.error}</span>}
        </div>

        <div className="rounded-tag-lg border border-line bg-panel/50 p-5 text-sm leading-6 text-mute">
          <p className="font-semibold text-ink">Konfirmasi transfer</p>
          <p className="mt-1">
            Klien diarahkan mengirim konfirmasi ke WhatsApp <span className="font-medium text-ink/80">{waNumber}</span>.
            Nomor ini diatur lewat <code className="rounded bg-ink/5 px-1">ADMIN_WA</code> / konstanta di{" "}
            <code className="rounded bg-ink/5 px-1">src/lib/site.ts</code>.
          </p>
        </div>
      </form>

      <aside className="lg:sticky lg:top-24">
        <p className="eyebrow">Pratinjau</p>
        <div className={`mt-3 rounded-tag-lg p-6 ${form.enabled ? "bg-ink text-paper" : "border border-line bg-panel/50 text-ink/45"}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${form.enabled ? "text-paper/60" : "text-ink/50"}`}>
            Pembayaran
          </p>
          {hasBankLogo(form.bankName) && (
            <BankLogo bank={form.bankName} className="mb-4 block h-5 w-auto" />
          )}
          <p className={`mt-4 text-sm ${form.enabled ? "text-paper/60" : "text-ink/45"}`}>
            Transfer {form.bankName || "bank"}
          </p>
          <p className="mt-1 break-all text-2xl font-semibold tracking-tight tabular-nums">
            {form.bankAccount || "—"}
          </p>
          {form.bankHolder && <p className={`mt-1 text-sm ${form.enabled ? "text-paper/60" : "text-ink/45"}`}>a.n. {form.bankHolder}</p>}
          {form.note && (
            <p className={`mt-4 border-t pt-3 text-[13px] leading-5 ${form.enabled ? "border-paper/15 text-paper/50" : "border-line text-ink/40"}`}>
              {form.note}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-mute">
          {form.enabled ? "Pratinjau seperti yang dilihat klien di halaman lacak." : "Pembayaran disembunyikan dari klien."}
        </p>
      </aside>
    </div>
  );
}
