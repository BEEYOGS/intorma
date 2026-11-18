"use client";

import { useActionState, useState } from "react";
import { createOrder } from "@/app/actions";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { DateField } from "@/components/DateField";
import type { Service } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { waLink } from "@/lib/site";

type PaymentInfo = {
  enabled: boolean;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  note: string;
};

export function OrderForm({
  services,
  preselect,
  payment,
}: {
  services: Service[];
  preselect?: string;
  payment: PaymentInfo;
}) {
  const [state, action, pending] = useActionState(createOrder, null);
  const v = state?.values ?? {};
  const initial = services.find((s) => s.id === (v.service ?? preselect)) ?? services[0];
  const [selected, setSelected] = useState(initial?.id ?? "");
  const chosen = services.find((s) => s.id === selected);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14">
      <form action={action} className="space-y-11">
        {state?.error && (
          <div role="alert" className="flex gap-3 rounded-tag-sm border border-[#c0392b]/35 bg-[#c0392b]/[0.06] px-4 py-3.5 text-sm text-[#8f2b20]">
            <span aria-hidden className="mt-0.5 font-bold">!</span>
            <p>{state.error}</p>
          </div>
        )}

        <fieldset>
          <legend className="mb-1 text-xl font-semibold tracking-tight">Pilih layanan</legend>
          <p className="mb-5 text-sm text-mute">Harga di bawah adalah titik awal. Harga final dikonfirmasi setelah brief dibaca.</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {services.map((s) => {
              const on = selected === s.id;
              return (
                <label key={s.id} className="block cursor-pointer">
                  <input
                    type="radio"
                    name="service"
                    value={s.id}
                    checked={on}
                    onChange={() => setSelected(s.id)}
                    className="peer sr-only"
                    required
                  />
                  <span
                    className={`flex h-full flex-col justify-between gap-4 rounded-tag-sm border p-4 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                      on ? "border-ink bg-ink text-paper" : "border-line bg-panel/50 text-ink hover:border-ink/40"
                    }`}
                  >
                    <span>
                      <span className="block font-semibold leading-snug">{s.name}</span>
                      <span className={`mt-1 block text-[13px] leading-5 ${on ? "text-paper/60" : "text-mute"}`}>{s.blurb}</span>
                    </span>
                    <span className={`flex items-center justify-between gap-3 border-t pt-3 text-[13px] ${on ? "border-paper/20" : "border-line"}`}>
                      <span className="font-semibold">{s.price_from ? `Mulai ${rupiah(s.price_from)}` : "Sesuai brief"}</span>
                      <span className={on ? "text-paper/55" : "text-mute"}>{s.days} hari</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xl font-semibold tracking-tight">Data kamu</legend>
          <p className="mb-5 text-sm text-mute">Dipakai untuk mengirim kode pesanan dan kabar progres lewat WhatsApp.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="label">Nama</span>
              <input name="name" defaultValue={v.name} autoComplete="name" className="field" required placeholder="Nama kamu" />
            </label>
            <label className="block">
              <span className="label">Nomor WhatsApp</span>
              <input name="wa" defaultValue={v.wa} inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" className="field" required />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xl font-semibold tracking-tight">Brief</legend>
          <p className="mb-5 text-sm text-mute">Ceritakan singkat: untuk apa desainnya, siapa yang melihat, dan gaya yang kamu suka.</p>
          <label className="block">
            <span className="sr-only">Brief</span>
            <textarea
              name="brief"
              defaultValue={v.brief}
              rows={6}
              className="field resize-y"
              required
              minLength={15}
              placeholder="Contoh: butuh logo untuk kedai kopi kecil, kesannya hangat dan sederhana. Suka warna earthy, tidak suka yang ramai."
            />
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xl font-semibold tracking-tight">Detail tambahan</legend>
          <p className="mb-5 text-sm text-mute">Opsional. Boleh dikosongkan kalau belum ada.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="label">Link referensi</span>
              <input name="ref" type="url" defaultValue={v.ref} placeholder="https://" className="field" />
            </label>
            <label className="block">
              <span className="label">Ingin selesai tanggal</span>
              <DateField name="deadline" defaultValue={v.deadline} />
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
            {pending ? "Mengirim…" : "Kirim pesanan"}
            {!pending && <span aria-hidden="true">→</span>}
          </button>
          <p className="text-sm leading-6 text-mute sm:max-w-[18rem] sm:text-right">
            Setelah terkirim kamu dapat kode pesanan dan salinannya di WhatsApp.
          </p>
        </div>
      </form>

      <aside aria-label="Ringkasan pesanan" className="hidden lg:sticky lg:top-24 lg:block">
        <div className="rounded-tag-lg border border-line bg-panel/60 p-6">
          <p className="eyebrow">Ringkasan</p>
          <p className="mt-4 text-lg font-semibold leading-snug">{chosen?.name ?? "Pilih layanan"}</p>
          <p className="mt-1 text-sm text-mute">{chosen?.blurb ?? "Belum ada layanan dipilih."}</p>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Estimasi harga</dt>
              <dd className="font-semibold">
                {chosen?.price_from ? `Mulai ${rupiah(chosen.price_from)}` : "Sesuai brief"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Pengerjaan</dt>
              <dd className="font-semibold">± {chosen?.days ?? 3} hari</dd>
            </div>
            {payment.enabled && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-mute">Pembayaran</dt>
                <dd className="font-semibold">{payment.bankName || "Transfer"}</dd>
              </div>
            )}
          </dl>

          {payment.enabled && (payment.bankAccount || payment.note) && (
            <div className="mt-5 rounded-tag-sm bg-sand/70 px-4 py-3 text-[13px] leading-5 text-ink/70">
              <p className="font-semibold text-ink">
                {hasBankLogo(payment.bankName) && (
                  <span className="mb-2 inline-flex rounded-[0.5rem] border border-line bg-ink px-2.5 py-1.5 align-middle">
                    <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                  </span>
                )}
                <span className="block">Transfer {payment.bankName} {payment.bankAccount}</span>
              </p>
              {payment.bankHolder && <p>a.n. {payment.bankHolder}</p>}
              {payment.note && <p className="mt-1 text-ink/55">{payment.note}</p>}
            </div>
          )}

          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
            Belum yakin harus pilih apa?{" "}
            <a href={waLink("Halo in.torma, saya mau tanya soal layanan desain.")} target="_blank" rel="noreferrer" className="font-semibold text-ink underline decoration-ink/25 underline-offset-2 hover:decoration-ink">
              Tanya dulu lewat WhatsApp
            </a>
            .
          </p>
        </div>
      </aside>
    </div>
  );
}
