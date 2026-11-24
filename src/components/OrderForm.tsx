"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { createOrder } from "@/app/actions";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { DateField } from "@/components/DateField";
import { Barcode, ToneChips, CropCorners, RegMark } from "@/components/Press";
import { WhatsAppLink } from "@/components/WhatsApp";
import type { Service } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { calculatePrice, formatQty, priceLabel } from "@/lib/pricing";
import type { UploadedFile } from "@/lib/drive";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

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
  const filesFieldRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadReady, setUploadReady] = useState<boolean | null>(null);
  const bypassRef = useRef(false);
  const v = state?.values ?? {};

  useEffect(() => {
    let live = true;
    fetch("/api/upload/token", { cache: "no-store" })
      .then((res) => live && setUploadReady(res.ok))
      .catch(() => live && setUploadReady(false));
    return () => {
      live = false;
    };
  }, []);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(null);
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 12));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadOne(file: File, token: string, folder: string): Promise<UploadedFile> {
    const init = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-upload-content-type": file.type || "application/octet-stream",
          "x-upload-content-length": String(file.size),
        },
        body: JSON.stringify({ name: file.name, parents: [folder] }),
      },
    );
    if (!init.ok) throw new Error(`Gagal memulai unggahan (HTTP ${init.status}).`);
    const sessionUrl = init.headers.get("location");
    if (!sessionUrl) throw new Error("Sesi unggahan tidak dibuat.");

    if (file.size === 0) {
      const res = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-range": "bytes */0" },
      });
      if (res.ok) {
        const json = (await res.json()) as { id?: string };
        if (!json.id) throw new Error("Unggahan selesai tanpa id file.");
        return { id: json.id, name: file.name, size: 0, mime: file.type };
      }
      throw new Error(`Unggahan gagal (HTTP ${res.status}).`);
    }

    const chunkSize = Math.max(4 * 1024 * 1024, Math.ceil(file.size / 30));
    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const res = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-range": `bytes ${offset}-${end - 1}/${file.size}` },
        body: file.slice(offset, end),
      });
      if (res.ok) {
        const json = (await res.json()) as { id?: string };
        if (!json.id) throw new Error("Unggahan selesai tanpa id file.");
        return { id: json.id, name: file.name, size: file.size, mime: file.type };
      }
      if (res.status === 308) {
        offset = end;
        continue;
      }
      throw new Error(`Unggahan gagal (HTTP ${res.status}).`);
    }
    throw new Error("Unggahan tidak selesai.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }
    event.preventDefault();
    if (!files.length) {
      bypassRef.current = true;
      formRef.current?.requestSubmit();
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    try {
      const res = await fetch("/api/upload/token", { cache: "no-store" });
      if (!res.ok) throw new Error("Upload belum tersedia. Pakai kolom link referensi, atau coba lagi nanti.");
      const { token, folder } = (await res.json()) as { token: string; folder: string };

      let done = 0;
      const uploaded: UploadedFile[] = [];
      for (const file of files) {
        const item = await uploadOne(file, token, folder);
        uploaded.push(item);
        done += file.size;
        setUploadProgress(totalBytes ? Math.round((done / totalBytes) * 100) : 100);
      }

      if (filesFieldRef.current) {
        filesFieldRef.current.value = uploaded
          .map((f) => [f.id, f.name.replace(/[|;]/g, "_"), f.size, f.mime].join("|"))
          .join(";");
      }
      setUploading(false);
      bypassRef.current = true;
      formRef.current?.requestSubmit();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah file.");
      setUploading(false);
    }
  }
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

  function serviceCard(s: Service, accent: "ink" | "silver") {
    const on = selected === s.id;
    const ring = accent === "ink" ? "border-ink bg-ink/[0.08]" : "border-silver bg-silver/[0.08]";
    const dot = accent === "ink" ? "bg-ink" : "bg-silver";
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
          className={`relative flex h-full flex-col justify-between gap-4 rounded-tag border p-4 transition-all duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
            on ? `${ring} shadow-ticket` : "border-line bg-panel/50 hover:border-mute/50 hover:bg-panel"
          }`}
        >
          <span aria-hidden className={`absolute right-3 top-3 grid size-5 place-items-center rounded-tag-xs border transition-all ${on ? "border-transparent" : "border-line"}`}>
            <span className={`size-2.5 rounded-full transition-transform ${dot} ${on ? "scale-100" : "scale-0"}`} />
          </span>
          <span>
            <span className="block pr-7 font-semibold leading-snug">{s.name}</span>
            <span className="mt-1 block text-[13px] leading-5 text-mute">{s.blurb}</span>
          </span>
          <span className="flex items-center justify-between gap-3 border-t border-line/80 pt-3 font-mono text-[12px]">
            <span className={`font-semibold tabular-nums ${on ? (accent === "ink" ? "text-ink" : "text-silver") : "text-ink/80"}`}>
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
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-12">
        <input ref={filesFieldRef} type="hidden" name="files" value="" />
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-4 font-mono text-[12px] uppercase tracking-[0.1em] text-mute">
          {[
            ["01", "Pilih layanan", "text-ink"],
            ["02", "Isi detail", "text-silver"],
            ["03", "Kirim & pantau", "text-steel"],
          ].map(([n, label, color], index) => (
            <li key={n} className="flex items-center gap-3">
              <span className={`font-serif text-base italic ${color}`}>{n}</span>
              <span className="font-semibold text-ink/75">{label}</span>
              {index < 2 && <span aria-hidden className="text-line">/</span>}
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-3 rounded-tag-sm border border-ink/25 bg-ink/[0.05] px-4 py-3.5">
          <RegMark className="mt-0.5 size-4 shrink-0 text-ink" />
          <p className="text-sm leading-6 text-ink/70">
            <span className="font-semibold text-ink">Harga tampil di bawah dan dihitung otomatis.</span>{" "}
            Pilih layanan dan isi jumlahnya—totalnya langsung terlihat sebelum kamu mengirim.
          </p>
        </div>

        {state?.error && (
          <div role="alert" className="flex gap-3 rounded-tag-sm border border-dashed border-silver/40 bg-silver/[0.08] px-4 py-3.5 text-sm text-silver">
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
                <span aria-hidden className="h-3 w-3 bg-ink" />
                <span className="font-serif text-xl italic text-ink/80">Desain</span>
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">{services.filter((s) => s.pricing_mode !== "per_unit").map((s) => serviceCard(s, "ink"))}</div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-3">
                <span aria-hidden className="h-3 w-3 bg-silver" />
                <span className="font-serif text-xl italic text-ink/80">Cetak</span>
                <span aria-hidden className="h-px flex-1 bg-line" />
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">{printServices.map((s) => serviceCard(s, "silver"))}</div>
            </div>
          </div>
        </fieldset>

        {perUnit && chosen && (
          <fieldset>
            <legend className="mb-1 text-xl font-semibold tracking-tight">Berapa banyak?</legend>
            <p className="mb-5 text-sm text-mute">
              Isi jumlah {unit}. Harga otomatis tersesuaikan—kalau lebih banyak atau kurang, langsung berubah.
            </p>
            <div className="relative rounded-tag-lg border border-line bg-panel/60 p-5">
              <CropCorners className="border-silver/40" />
              <label className="block">
                <span className="label">Jumlah ({unit})</span>
                <div className="flex items-stretch gap-2">
                  <button type="button" onClick={() => stepQty(-1)} aria-label={`Kurangi ${unit}`} className="grid size-12 shrink-0 place-items-center rounded-tag-sm border border-line font-mono text-lg text-ink/70 transition-colors hover:border-silver hover:text-silver">
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
                  <button type="button" onClick={() => stepQty(1)} aria-label={`Tambah ${unit}`} className="grid size-12 shrink-0 place-items-center rounded-tag-sm border border-line font-mono text-lg text-ink/70 transition-colors hover:border-silver hover:text-silver">
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
                  <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-silver">
                    {priced?.price != null ? rupiah(priced.price) : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-mute">Belum termasuk finishing/ongkir.</p>
                </div>
              </div>
              {priced?.error && <p className="mt-3 text-sm text-silver">{priced.error}</p>}
            </div>
          </fieldset>
        )}

        <div className="rounded-tag-lg border border-line bg-panel/60 p-5 lg:hidden">
          <p className="eyebrow">Ringkasan</p>
          <p className="mt-2 font-semibold">{chosen?.name ?? "Pilih layanan"}</p>
          {breakdown && <p className="mt-1 font-mono text-sm text-mute">{breakdown}</p>}
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-ink">
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
          <legend className="mb-1 text-xl font-semibold tracking-tight">File referensi</legend>
          <p className="mb-5 text-sm text-mute">
            Opsional — logo lama, foto produk, atau referensi. Maksimal 12 file, tanpa batas ukuran, langsung tersimpan ke Drive admin.
          </p>
          {uploadReady === false ? (
            <div className="rounded-tag-sm border border-dashed border-line px-4 py-3.5 text-sm text-mute">
              Upload sedang nonaktif. Sementara pakai kolom link referensi di bawah.
            </div>
          ) : (
            <div className="space-y-4">
              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-tag-lg border border-dashed px-6 py-9 text-center transition-colors ${
                  files.length ? "border-silver/50 bg-silver/[0.06]" : "border-line hover:border-mute/60 hover:bg-panel/50"
                }`}
              >
                <input type="file" multiple className="sr-only" onChange={(event) => addFiles(event.target.files)} disabled={uploading} />
                <span className="font-mono text-sm font-semibold text-ink/80">
                  + Pilih file{files.length ? ` (${files.length} dipilih)` : ""}
                </span>
                <span className="text-xs text-mute">Gambar, PDF, ZIP — dikirim langsung ke Google Drive admin.</span>
              </label>

              {files.length > 0 && (
                <ul className="divide-y divide-line rounded-tag-sm border border-line bg-panel/50 px-4">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{f.name}</span>
                        <span className="block font-mono text-[11px] text-mute">{formatBytes(f.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        disabled={uploading}
                        className="font-mono text-xs text-mute transition-colors hover:text-silver disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {uploading && (
                <div className="rounded-tag-sm border border-silver/40 bg-silver/[0.06] px-4 py-3">
                  <div className="flex items-center justify-between font-mono text-xs text-mute">
                    <span>Mengunggah ke Google Drive…</span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-silver transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {uploadError && (
                <div role="alert" className="rounded-tag-sm border border-dashed border-silver/40 bg-silver/[0.06] px-4 py-3 text-sm text-silver">
                  <span aria-hidden className="mr-2 font-mono font-bold">!</span>
                  {uploadError}
                </div>
              )}
            </div>
          )}
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
          <button type="submit" disabled={pending || uploading || Boolean(priced?.error)} className="btn-primary w-full sm:w-auto">
            {uploading ? "Mengunggah…" : pending ? "Mengirim…" : "Kirim pesanan"}
            {!pending && !uploading && <span aria-hidden="true">→</span>}
          </button>
          <p className="text-sm leading-6 text-mute sm:max-w-[18rem] sm:text-right">
            Setelah terkirim kode pesanan langsung tampil di layar dan salinannya dikirim ke WhatsApp.
            Harga final tetap dikonfirmasi admin sebelum produksi.
          </p>
        </div>
      </form>

      <aside aria-label="Ringkasan pesanan" className="hidden lg:sticky lg:top-24 lg:block">
        <div className="relative rounded-tag-xl border border-line bg-panel/70 p-6 shadow-ticket">
          <CropCorners />
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Ringkasan</p>
            <ToneChips className="size-2" />
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
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-ink">
              {priced?.price != null ? rupiah(priced.price) : "—"}
            </p>
            {breakdown && <p className="mt-1 font-mono text-xs text-mute">{breakdown}</p>}
            {!perUnit && priced?.price == null && (
              <p className="mt-1 text-xs text-mute">Harga final dikonfirmasi setelah brief dibaca.</p>
            )}
          </div>

          {payment.enabled && (payment.bankAccount || payment.note) && (
            <div className="mt-5 rounded-tag-sm border border-line bg-sand/80 px-4 py-3 text-[13px] leading-5 text-ink/70">
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
              <WhatsAppLink text="Halo in.torma, saya mau tanya soal layanan desain." className="link-accent">
                Tanya dulu lewat WhatsApp
              </WhatsAppLink>.
            </p>
          </div>
        </div>
      </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Total</p>
            <p className="truncate font-mono text-xl font-bold tabular-nums text-ink">
              {priced?.price != null ? rupiah(priced.price) : "Belum dihitung"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={pending || uploading || Boolean(priced?.error)}
            className="btn-primary min-h-11 shrink-0 px-5 text-sm"
          >
            {uploading ? "Mengunggah…" : pending ? "Mengirim…" : "Kirim pesanan"}
          </button>
        </div>
      </div>
    </>
  );
}