"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clipboard, Minus, Ruler } from "lucide-react";
import { toast } from "@/components/Toast";

type ColorMode = "CMYK" | "RGB";

type Preset = {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
  dpi: number;
  bleed: number;
  safe: number;
  color: ColorMode;
};

const PRESETS: Preset[] = [
  { id: "kartu", label: "Kartu nama", hint: "9 × 5,5 cm", width: 9, height: 5.5, dpi: 300, bleed: 3, safe: 3, color: "CMYK" },
  { id: "a4", label: "Poster A4", hint: "21 × 29,7 cm", width: 21, height: 29.7, dpi: 300, bleed: 3, safe: 5, color: "CMYK" },
  { id: "a3", label: "Poster A3", hint: "29,7 × 42 cm", width: 29.7, height: 42, dpi: 300, bleed: 3, safe: 5, color: "CMYK" },
  { id: "stiker", label: "Stiker", hint: "10 × 10 cm", width: 10, height: 10, dpi: 300, bleed: 3, safe: 3, color: "CMYK" },
  { id: "spanduk", label: "Spanduk", hint: "200 × 100 cm", width: 200, height: 100, dpi: 100, bleed: 20, safe: 50, color: "CMYK" },
  { id: "kaos", label: "Kaos / DTF", hint: "30 × 40 cm", width: 30, height: 40, dpi: 300, bleed: 0, safe: 10, color: "CMYK" },
];

const CM_PER_INCH = 2.54;

function num(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toPx(cm: number, dpi: number): number {
  return Math.max(1, Math.round((cm / CM_PER_INCH) * dpi));
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function format(value: number, digits = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function ratio(width: number, height: number): string {
  const w = Math.max(1, Math.round(width * 100));
  const h = Math.max(1, Math.round(height * 100));
  const divisor = gcd(w, h);
  return `${w / divisor}:${h / divisor}`;
}

export function PrintCalculator() {
  const [presetId, setPresetId] = useState("a4");
  const [width, setWidth] = useState("21");
  const [height, setHeight] = useState("29.7");
  const [quantity, setQuantity] = useState("1");
  const [dpi, setDpi] = useState("300");
  const [bleed, setBleed] = useState("3");
  const [safe, setSafe] = useState("5");
  const [color, setColor] = useState<ColorMode>("CMYK");

  const applyPreset = (preset: Preset) => {
    setPresetId(preset.id);
    setWidth(String(preset.width));
    setHeight(String(preset.height));
    setDpi(String(preset.dpi));
    setBleed(String(preset.bleed));
    setSafe(String(preset.safe));
    setColor(preset.color);
  };

  const result = useMemo(() => {
    const w = num(width, 21, 0.1, 1000);
    const h = num(height, 29.7, 0.1, 1000);
    const qty = Math.round(num(quantity, 1, 1, 100000));
    const resolution = Math.round(num(dpi, 300, 72, 1200));
    const bleedMm = num(bleed, 3, 0, 50);
    const safeMm = num(safe, 5, 0, 100);
    const bleedCm = bleedMm / 10;
    const safeCm = safeMm / 10;

    const canvasW = w + bleedCm * 2;
    const canvasH = h + bleedCm * 2;
    const safeW = Math.max(0, w - safeCm * 2);
    const safeH = Math.max(0, h - safeCm * 2);

    const canvasPxW = toPx(canvasW, resolution);
    const canvasPxH = toPx(canvasH, resolution);
    const finishPxW = toPx(w, resolution);
    const finishPxH = toPx(h, resolution);
    const channels = color === "CMYK" ? 4 : 3;
    const rawMb = (canvasPxW * canvasPxH * channels) / 1024 / 1024;
    const areaM2 = (w * h) / 10000;
    const lowestSide = Math.min(w, h);
    const recommended = lowestSide >= 60 ? 100 : 300;
    const invalidSafe = safeW <= 0 || safeH <= 0;

    return {
      w,
      h,
      qty,
      resolution,
      bleedMm,
      safeMm,
      canvasW,
      canvasH,
      safeW,
      safeH,
      canvasPxW,
      canvasPxH,
      finishPxW,
      finishPxH,
      rawMb,
      pdfLowMb: rawMb * 0.35,
      pdfHighMb: rawMb * 0.6,
      areaM2,
      totalAreaM2: areaM2 * qty,
      aspect: ratio(w, h),
      recommended,
      invalidSafe,
      belowRecommended: resolution < recommended,
    };
  }, [width, height, quantity, dpi, bleed, safe, color]);

  const specText = [
    "Spesifikasi cetak in.torma",
    `Ukuran jadi: ${format(result.w, 1)} × ${format(result.h, 1)} cm`,
    `Bleed: ${format(result.bleedMm, 0)} mm · Area aman: ${format(result.safeMm, 0)} mm`,
    `Ukuran kanvas: ${format(result.canvasW, 2)} × ${format(result.canvasH, 2)} cm`,
    `Resolusi: ${format(result.resolution)} dpi · ${color}`,
    `Ukuran pixel kanvas: ${format(result.canvasPxW)} × ${format(result.canvasPxH)} px`,
    `Rasio: ${result.aspect} · Jumlah: ${format(result.qty)}`,
  ].join("\n");

  const copySpec = async () => {
    try {
      await navigator.clipboard.writeText(specText);
      toast("Spesifikasi disalin.", "ok");
    } catch {
      toast("Gagal menyalin. Pilih teks hasil hitung lalu salin manual.", "error");
    }
  };

  return (
    <div className="animate-in">
      <section className="pb-8 pt-16 sm:pt-24">
        <div className="wrap">
          <p className="eyebrow mb-4">Pre-press</p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ukur dulu, baru kirim file.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)] sm:text-base">
                Hitung bleed, area aman, resolusi, dan ukuran file sebelum desain dikirim.
                Angka di sini adalah panduan produksi, bukan pengganti cek manual tim pre-press.
              </p>
            </div>
            <Link href="/order" className="btn btn-ghost w-fit !h-10 px-4 text-sm">
              Lanjut pesan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="wrap grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-6">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Ruler aria-hidden className="size-4 text-accent" />
              <p className="text-sm font-medium">Spesifikasi</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">
              Pilih preset lalu ubah angka sesuai kebutuhan. Semua hasil diperbarui langsung.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESETS.map((preset) => {
                const active = preset.id === presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    aria-pressed={active}
                    className={`rounded-[var(--radius-sharp)] border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] bg-[var(--bg-2)] hover:border-[var(--border-2)]"
                    }`}
                  >
                    <span className={`block text-xs font-medium ${active ? "text-accent" : "text-[var(--text)]"}`}>
                      {preset.label}
                    </span>
                    <span className="mono mt-0.5 block text-xs text-[var(--text-3)]">{preset.hint}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Lebar jadi" unit="cm">
                <input
                  className="input field mono"
                  inputMode="decimal"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={width}
                  onChange={(event) => {
                    setWidth(event.target.value);
                    setPresetId("custom");
                  }}
                  aria-label="Lebar jadi dalam sentimeter"
                />
              </Field>
              <Field label="Tinggi jadi" unit="cm">
                <input
                  className="input field mono"
                  inputMode="decimal"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={height}
                  onChange={(event) => {
                    setHeight(event.target.value);
                    setPresetId("custom");
                  }}
                  aria-label="Tinggi jadi dalam sentimeter"
                />
              </Field>
              <Field label="Jumlah" unit="pcs">
                <input
                  className="input field mono"
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-label="Jumlah cetakan"
                />
              </Field>
              <Field label="Resolusi" unit="dpi">
                <input
                  className="input field mono"
                  inputMode="numeric"
                  type="number"
                  min="72"
                  max="1200"
                  step="10"
                  value={dpi}
                  onChange={(event) => {
                    setDpi(event.target.value);
                    setPresetId("custom");
                  }}
                  aria-label="Resolusi dalam dpi"
                />
              </Field>
              <Field label="Bleed" unit="mm">
                <input
                  className="input field mono"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={bleed}
                  onChange={(event) => {
                    setBleed(event.target.value);
                    setPresetId("custom");
                  }}
                  aria-label="Tambahan bleed dalam milimeter"
                />
              </Field>
              <Field label="Area aman" unit="mm">
                <input
                  className="input field mono"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={safe}
                  onChange={(event) => {
                    setSafe(event.target.value);
                    setPresetId("custom");
                  }}
                  aria-label="Area aman dalam milimeter"
                />
              </Field>
            </div>

            <div className="mt-5">
              <label htmlFor="warna" className="mb-2 block text-xs font-medium text-[var(--text-2)]">
                Mode warna
              </label>
              <select
                id="warna"
                className="input field"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value as ColorMode);
                  setPresetId("custom");
                }}
              >
                <option value="CMYK">CMYK · standar cetak</option>
                <option value="RGB">RGB · perlu konversi</option>
              </select>
            </div>
          </div>

          <div className="card h-fit p-5 sm:p-6 lg:sticky lg:top-20">
            <p className="text-sm font-medium">Hasil hitung</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">Ukuran kanvas sudah termasuk bleed di semua sisi.</p>

            <div className="mt-5 rounded-[var(--radius-sharp)] border border-[var(--border)] bg-[var(--bg-2)] p-4">
              <p className="eyebrow !text-xs">Ukuran kanvas</p>
              <p className="mono mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {format(result.canvasPxW)} × {format(result.canvasPxH)} <span className="text-sm font-normal text-[var(--text-3)]">px</span>
              </p>
              <p className="mono mt-1 text-xs text-accent">
                {format(result.canvasW, 2)} × {format(result.canvasH, 2)} cm · {format(result.resolution)} dpi
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
              <Metric label="Ukuran jadi" value={`${format(result.w, 1)} × ${format(result.h, 1)} cm`} />
              <Metric label="Rasio" value={result.aspect} />
              <Metric label="Area aman" value={`${format(result.safeW, 2)} × ${format(result.safeH, 2)} cm`} />
              <Metric label="Area cetak" value={`${format(result.areaM2, 3)} m²`} />
              <Metric label="Total area" value={`${format(result.totalAreaM2, 2)} m²`} />
              <Metric label="Pixel jadi" value={`${format(result.finishPxW)} × ${format(result.finishPxH)}`} />
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-medium">Estimasi ukuran file</p>
              <p className="mono mt-2 text-sm">
                TIFF {color}: ~{format(result.rawMb, 1)} MB
              </p>
              <p className="mono mt-1 text-xs text-[var(--text-3)]">
                PDF/X dengan gambar terkompresi: ~{format(result.pdfLowMb, 1)}–{format(result.pdfHighMb, 1)} MB
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-3)]">
                Estimasi belum termasuk font tersemat dan layer. Ukuran akhir mengikuti aplikasi desain.
              </p>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-medium">Pemeriksaan</p>
              <ul className="mt-3 space-y-2 text-xs">
                <CheckItem ok={!result.invalidSafe} text="Area aman masih lebih besar dari nol" />
                <CheckItem ok={!result.belowRecommended} text={`Resolusi minimal ${result.recommended} dpi untuk ukuran ini`} />
                <CheckItem ok={color === "CMYK"} text="Mode warna CMYK untuk cetak" />
                <CheckItem ok={result.bleedMm > 0 || result.w >= 30} text="Bleed disertakan atau media tidak memerlukan bleed" />
              </ul>
              {result.invalidSafe && (
                <p role="alert" className="mt-3 rounded-[var(--radius-sharp)] border border-[var(--red)]/40 px-3 py-2 text-xs text-[var(--red)]">
                  Area aman lebih besar dari ukuran jadi. Kecilkan nilai area aman atau perbesar ukuran.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={copySpec} className="btn btn-ghost flex-1 !h-12 text-xs">
                <Clipboard aria-hidden className="size-3.5" /> Salin spesifikasi
              </button>
              <Link href="/order" className="btn btn-primary flex-1 !h-12 text-xs">
                Buat pesanan <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="wrap">
          <div className="card p-5 sm:p-6">
            <p className="eyebrow mb-4">Catatan produksi</p>
            <div className="grid gap-5 sm:grid-cols-3">
              <Note title="Bleed" body="Tambahkan 3 mm di semua sisi untuk kertas, 20 mm untuk spanduk. Background harus ikut terpotong, bukan hanya border." />
              <Note title="Area aman" body="Teks dan elemen penting ditaruh di dalam area aman. Garis potong tidak boleh melewati info penting." />
              <Note title="File akhir" body="Kirim PDF/X-4 atau TIFF dengan font tersemat. Nama file memakai kode pesanan agar mudah cocokkan." />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, unit, children }: { label: string; unit: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
        <span className="mono text-xs text-[var(--text-3)]">{unit}</span>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--text-3)]">{label}</p>
      <p className="mono mt-1 truncate text-xs text-[var(--text)]" title={value}>{value}</p>
    </div>
  );
}

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2 text-[var(--text-2)]">
      <span
        aria-hidden
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
          ok ? "border-[var(--accent)] bg-[var(--accent)]/15 text-accent" : "border-[var(--border-2)] text-[var(--text-3)]"
        }`}
      >
        {ok ? <Check className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
      </span>
      <span>{text}</span>
    </li>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-3)]">{body}</p>
    </div>
  );
}
