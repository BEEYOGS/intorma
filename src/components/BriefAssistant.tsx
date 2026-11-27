"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

const STYLES = ["Minimal", "Modern", "Playful", "Elegant", "Bold", "Vintage", "Earthy", "Techy"];

export function BriefAssistant({
  category,
  dimensions,
  onApply,
}: {
  category: string;
  dimensions?: string;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [mustHave, setMustHave] = useState("");
  const [references, setReferences] = useState("");
  const [notes, setNotes] = useState("");

  function compose() {
    const isPrint = category === "print";
    const lines: string[] = [];
    if (purpose.trim()) lines.push(`Tujuan: ${purpose.trim()}`);
    if (audience.trim()) lines.push(`Audiens: ${audience.trim()}`);
    if (style) lines.push(`Gaya: ${style}`);
    if (colors.trim()) lines.push(`Warna: ${colors.trim()}`);
    if (mustHave.trim()) lines.push(`Elemen wajib: ${mustHave.trim()}`);
    if (references.trim()) lines.push(`Referensi: ${references.trim()}`);
    if (dimensions) lines.push(`Ukuran final: ${dimensions}`);
    if (notes.trim()) lines.push(`Catatan produksi: ${notes.trim()}`);
    if (isPrint && !notes.trim()) {
      lines.push("Catatan produksi: cetak sesuai file, warna cerah, finishing standar.");
    }
    const text = lines.join("\n");
    if (text.trim()) onApply(text);
  }

  function reset() {
    setPurpose("");
    setAudience("");
    setStyle("");
    setColors("");
    setMustHave("");
    setReferences("");
    setNotes("");
  }

  return (
    <div className="rounded-tag-sm border border-accent/25 bg-accent/[0.05] p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles aria-hidden className="size-4 text-accent" />
          Bantuan susun brief
        </span>
        <ChevronDown
          aria-hidden
          className={`size-4 text-mute transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-mute">
            Jawab singkat, lalu tekan “Susun brief”. Hasilnya bisa diedit manual.
          </p>

          <label className="block">
            <span className="label">Tujuan</span>
            <input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder={category === "print" ? "Misalnya spanduk untuk promo akhir pekan" : "Misalnya logo untuk kedai kopi baru"}
              className="field"
            />
          </label>

          <label className="block">
            <span className="label">Audiens</span>
            <input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Siapa yang melihat? Usia, minat, atau konteks."
              className="field"
            />
          </label>

          <div>
            <span className="label">Gaya</span>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStyle((current) => (current === item ? "" : item))}
                  aria-pressed={style === item}
                  className={`min-h-9 rounded-tag-sm border px-3 text-xs font-medium transition-colors ${
                    style === item
                      ? "border-accent/40 bg-accent/10 text-ink"
                      : "border-line text-mute hover:border-[var(--border-2)] hover:text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label">Warna yang diinginkan</span>
            <input
              value={colors}
              onChange={(event) => setColors(event.target.value)}
              placeholder="Misalnya earthy, biru navy, monokrom"
              className="field"
            />
          </label>

          <label className="block">
            <span className="label">Elemen wajib</span>
            <input
              value={mustHave}
              onChange={(event) => setMustHave(event.target.value)}
              placeholder="Logo, nama brand, tagline, QR code, dll."
              className="field"
            />
          </label>

          <label className="block">
            <span className="label">Referensi</span>
            <input
              value={references}
              onChange={(event) => setReferences(event.target.value)}
              placeholder="Link atau nama brand yang disukai"
              className="field"
            />
          </label>

          <label className="block">
            <span className="label">Catatan tambahan</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Hal lain yang perlu kami tahu."
              className="field resize-y"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={compose} className="btn btn-primary min-h-9 px-4 text-sm">
              Susun brief
            </button>
            <button type="button" onClick={reset} className="btn btn-ghost min-h-9 px-4 text-sm">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
