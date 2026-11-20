"use client";

import { useActionState, useRef, useState } from "react";
import { createOrder } from "@/app/actions";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { DateField } from "@/components/DateField";
import { Barcode, CmykChips, CropCorners, RegMark } from "@/components/Press";
import type { Service } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { calculatePrice, formatQty, priceLabel } from "@/lib/pricing";
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
  const formRef = useRef<HTMLFormElement>(null);
  const v = state?.values ?? {};
  const initial = services.find((s) => s.id === (v.service ?? preselect)) ?? services[0];
  const [selected, setSelected] = useState(initial?.id ?? "");
  const [qty, setQty] = useState(v.qty || String(initial?.min_qty ?? 1));
  const printServices = services.filter((s) => s.pricing_mode === "per_unit");
  const chosen = services.find((s) => s.id === selected);
  const priced = chosen ? calculatePrice(chosen, qty) : null;
  const perUnit = chosen?.pricing_mode === "per_unit";
  const unit = chosen?.unit_label || "unit";
  const breakdown =
    priced?.price != null && priced.qty != null && priced.unitRate != null
      ? `${formatQty(priced.qty)} ${unit} × ${rupiah(priced.unitRate)}`
      : null;

  function pick(id: string) {
    setSelected(id);
    const next = services.find((s) => s.id === id);
    setQty(next?.pricing_mode === "per_unit" ? String(next.min_qty) : "");
  }

  function stepQty(delta: number) {
    const min = chosen?.min_qty ?? 1;
    const max = chosen?.max_qty ?? 10000;
    setQty((prev) => String(Math.min(max, Math.max(min, (Number(prev) || 0) + delta))));
  }

  function serviceCard(s: Service, accent: "cyan" | "magenta") {
    const on = selected === s.id;
    const ring = accent === "cyan" ? "border-cyan bg-cyan/[0.08]" : "border-magenta bg-magenta/[0.08]";
    const dot = accent === "cyan" ? "bg-cyan" : "bg-magenta";
    return (
      <label key={s.id} className="block cursor-pointer">
        <input
          type="radio"
          name="service"
          value={s.id}
          checked={on}
          onChange={() => pick(s.id)}
          className="peer sr-only"
          required
        />
        <span
          className={`relative flex h-full flex-col justify-between gap-4 border p-4 transition-all duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan ${
            on ? `${ring} shadow-ticket` : "border-line bg-panel/50 hover:border-mute/50 hover:bg-panel"
          }`}
        >
          <span aria-hidden className={`absolute right-3 top-3 grid size-5 place-items-center rounded-full border transition-all ${on ? "border-transparent" : "border-line"}`}>
            <span className={`size-2.5 rounded-full transition-transform ${dot} ${on ? "scale-100" : "scale-0"}`} />
          </span>
          <span>
            <span className="block pr-7 font-semibold leading-snug">{s.name}</span>
            <span className="mt-1 block text-[13px] leading-5 text-mute">{s.blurb}</span>
          </span>
          <span className="flex items-center justify-between gap-3 border-t border-line/80 pt-3 font-mono text-[12px]">
            <span className={`font-semibold tabular-nums ${on ? (accent === "cyan" ? "text-cyan" : "text-magenta") : "text-ink/80"}`}>
              {priceLabel(s)}
            </span>
            <span className="text-mute">± {s.days} hari</span>
          </span>
        </span>
      </label>
    );
  }

  return (
    <>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14">
      <form ref={formRef} action={action} className="space-y-12">
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-4 font-mono text-[12px] uppercase tracking-[0.1em] text-mute">
          {[
            ["01", "Pilih layanan", "text-cyan"],
            ["02", "Isi detail", "text-magenta"],
            ["03", "Kirim & pantau", "text-yellow"],
          ].map(([n, label, color], index) => (
            <li key={n} className="flex items-center gap-3">
              <span className={`font-serif text-base italic ${color}`}>{n}</span>
              <span className="font-semibold text-ink/75">{label}</span>
              {index < 2 && <span aria-hidden className="text-line">/</span>}
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-3 border border-cyan/25 bg-cyan/[0.05] px-4 py-3.5">
          <RegMark className="mt-0.5 size-4 shrink-0 text-cyan" />
          <p className="text-sm leading-6 text-ink/70">
            <span className="font-semibold text-ink">Harga tampil di bawah dan dihitung otomatis.</span>{" "}
            Pilih layanan dan isi jumlahnya—totalnya langsung terlihat sebelum kamu mengirim.
          </p>
        </div>

        {state?.error && (
          <div role="alert" className="flex gap-3 border border-red/40 bg-red/[0.08] px-4 py-3.5 text-sm text-red">
            <span aria-hidden className="mt-0.5 font-mono font-bold">!</span>
            <p>{state.error}</p>
          </div>
        )}

        <fieldset>
          <legend className="mb-1 text-xl font-semibold tracking-tight">Pilih layanan</legend>
          <p className="mb-5 text-sm text-mute">Harga per item sudah kami rangkum. Sisanya bisa dibicarakan lewat WhatsApp.</p>
          <div className="space-y-8">
            <div>
              <p className="mb-3 flex items-center gap-3">
                <span aria-hidden className="h-3 w-3 bg-cyan" />
                <span className="font-serif text-xl italic text-ink/80">Desain</span>
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">{services.filter((s) => s.pricing_mode !== "per_unit").map((s) => serviceCard(s, "cyan"))}</div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-3">
                <span aria-hidden className="h-3 w-3 bg-magenta" />
                <span className="font-serif text-xl italic text-ink/80">Cetak</span>
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">{printServices.map((s) => serviceCard(s, "magenta"))}</div>
            </div>
          </div>
        </fieldset>

        {perUnit && chosen && (
          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Berapa banyak?</legend>
            <p className="mb-5 text-sm text-mute">
              Isi jumlah {unit}. Harga otomatis tersesuaikan—kalau lebih banyak atau kurang, langsung berubah.
            </p>
            <div className="relative border border-line bg-panel/60 p-5">
              <CropCorners className="border-magenta/40" />
              <label className="block">
                <span className="label">Jumlah ({unit})</span>
                <div className="flex items-stretch gap-2">
                  <button type="button" onClick={() => stepQty(-1)} aria-label={`Kurangi ${unit}`} className="grid size-12 shrink-0 place-items-center border border-line font-mono text-lg text-ink/70 transition-colors hover:border-magenta hover:text-magenta">
                    −
                  </button>
                  <input
                    name="qty"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={chosen.min_qty}
                    max={chosen.max_qty}
                    value={qty}
                    onChange={(event) => setQty(event.target.value)}
                    className="field min-h-12 flex-1 text-center font-mono text-lg font-semibold tabular-nums"
                    required
                  />
                  <button type="button" onClick={() => stepQty(1)} aria-label={`Tambah ${unit}`} className="grid size-12 shrink-0 place-items-center border border-line font-mono text-lg text-ink/70 transition-colors hover:border-magenta hover:text-magenta">
                    +
                  </button>
                </div>
                <span className="mt-2 block font-mono text-xs text-mute">
                  Minimal {formatQty(chosen.min_qty)} {unit} · maksimal {formatQty(chosen.max_qty)} {unit}
                </span>
              </label>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-line pt-4">
                <div>
                  <p className="font-mono text-xs text-mute">{breakdown ?? "Harga per unit"}</p>
                  <p className="mt-1 text-sm font-medium text-ink/70">{priceLabel(chosen)}</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">Total sementara</p>
                  <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-magenta">
                    {priced?.price != null ? rupiah(priced.price) : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-mute">Belum termasuk finishing/ongkir.</p>
                </div>
              </div>
              {priced?.error && <p className="mt-3 text-sm text-red">{priced.error}</p>}
            </div>
          </fieldset>
        )}

        <div className="border border-line bg-panel/60 p-5 lg:hidden">
          <p className="eyebrow">Ringkasan</p>
          <p className="mt-2 font-semibold">{chosen?.name ?? "Pilih layanan"}</p>
          {breakdown && <p className="mt-1 font-mono text-sm text-mute">{breakdown}</p>}
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-cyan">
            {priced?.price != null ? rupiah(priced.price) : "Belum dihitung"}
          </p>
        </div>

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
          <p className="mb-5 text-sm text-mute">
            Ceritakan singkat: untuk apa desainnya, siapa yang melihat, dan gaya yang kamu suka.
            {perUnit && " Kalau ada ukuran atau finishing khusus, tulis di sini."}
          </p>
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
          <button type="submit" disabled={pending || Boolean(priced?.error)} className="btn-primary w-full sm:w-auto">
            {pending ? "Mengirim…" : "Kirim pesanan"}
            {!pending && <span aria-hidden="true">→</span>}
          </button>
          <p className="text-sm leading-6 text-mute sm:max-w-[18rem] sm:text-right">
            Setelah terkirim kamu dapat kode pesanan dan salinannya di WhatsApp. Harga final tetap
            dikonfirmasi admin sebelum produksi.
          </p>
        </div>
      </form>

      <aside aria-label="Ringkasan pesanan" className="hidden lg:sticky lg:top-24 lg:block">
        <div className="relative border border-line bg-panel/70 p-6 shadow-ticket">
          <CropCorners />
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Ringkasan</p>
            <CmykChips className="size-2" />
          </div>
          <p className="mt-4 text-lg font-semibold leading-snug">{chosen?.name ?? "Pilih layanan"}</p>
          <p className="mt-1 text-sm text-mute">{chosen?.blurb ?? "Belum ada layanan dipilih."}</p>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-mute">Harga satuan</dt>
              <dd className="font-mono font-semibold tabular-nums">{chosen ? priceLabel(chosen) : "—"}</dd>
            </div>
            {perUnit && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-mute">Jumlah</dt>
                <dd className="font-mono font-semibold tabular-nums">{qty || "—"} {unit}</dd>
              </div>
            )}
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

          <div className="mt-6 border-t border-dashed border-line pt-5">
            <p className="eyebrow">Total sementara</p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-cyan">
              {priced?.price != null ? rupiah(priced.price) : "—"}
            </p>
            {breakdown && <p className="mt-1 font-mono text-xs text-mute">{breakdown}</p>}
            {!perUnit && priced?.price == null && (
              <p className="mt-1 text-xs text-mute">Harga final dikonfirmasi setelah brief dibaca.</p>
            )}
          </div>

          {payment.enabled && (payment.bankAccount || payment.note) && (
            <div className="mt-5 border border-line bg-sand/80 px-4 py-3 text-[13px] leading-5 text-ink/70">
              {hasBankLogo(payment.bankName) && (
                <span className="mb-2 inline-flex rounded-tag-sm border border-line bg-ink px-2.5 py-1.5 align-middle">
                  <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                </span>
              )}
              <p className="font-mono font-semibold text-ink">Transfer {payment.bankName} {payment.bankAccount}</p>
              {payment.bankHolder && <p>a.n. {payment.bankHolder}</p>}
              {payment.note && <p className="mt-1 text-ink/55">{payment.note}</p>}
            </div>
          )}

          <div className="mt-6 border-t border-line pt-4">
            <Barcode value={(chosen?.id ?? "INTORMA").toUpperCase()} height={24} className="text-ink/35" label="" />
            <p className="mt-4 text-xs leading-5 text-mute">
              Belum yakin harus pilih apa?{" "}
              <a href={waLink("Halo in.torma, saya mau tanya soal layanan desain.")} target="_blank" rel="noreferrer" className="link-accent">
                Tanya dulu lewat WhatsApp
              </a>.
            </p>
          </div>
        </div>
      </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Total</p>
            <p className="truncate font-mono text-xl font-bold tabular-nums text-cyan">
              {priced?.price != null ? rupiah(priced.price) : "Belum dihitung"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={pending || Boolean(priced?.error)}
            className="btn-primary min-h-11 shrink-0 px-5 text-sm"
          >
            {pending ? "Mengirim…" : "Kirim pesanan"}
          </button>
        </div>
      </div>
    </>
  );
}