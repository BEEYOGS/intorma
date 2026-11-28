"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

const KEY = "intorma-install-checklist";
const STEPS = [
  "Buka situs ini di browser ponsel/PC",
  "Buka menu browser → Install / Add to Home screen",
  "Konfirmasi pemasangan",
  "Buka ikon in.torma dari layar utama",
];

export function InstallChecklist() {
  const [done, setDone] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]") as unknown;
      if (Array.isArray(parsed)) {
        setDone(parsed.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < STEPS.length));
      }
    } catch {
      // Abaikan penyimpanan rusak.
    }
    setHydrated(true);
  }, []);

  function toggle(index: number) {
    const next = done.includes(index) ? done.filter((item) => item !== index) : [...done, index];
    setDone(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Abaikan kegagalan penyimpanan.
    }
  }

  function reset() {
    setDone([]);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Abaikan.
    }
  }

  const progress = hydrated ? Math.round((done.length / STEPS.length) * 100) : 0;

  return (
    <section className="card p-5" aria-label="Checklist pemasangan">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Checklist saya</p>
          <p className="mt-2 text-sm font-semibold">Empat langkah sampai aplikasi muncul di layar utama.</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-tag-sm border border-line px-3 text-xs text-mute transition-colors hover:text-[var(--text)]"
        >
          <RotateCcw aria-hidden className="size-3.5" /> Ulangi
        </button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-mute" aria-live="polite">
        {hydrated ? `${done.length} dari ${STEPS.length} langkah selesai · ${progress}%` : "Memuat progres…"}
      </p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((step, index) => {
          const checked = done.includes(index);
          return (
            <li key={step}>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-tag-sm border border-line px-3 py-2.5 text-sm text-[var(--text-2)] transition-colors hover:border-[var(--border-2)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(index)}
                  className="peer sr-only"
                />
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[3px] border border-line transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                  {checked && <Check aria-hidden className="size-3.5 text-ink" />}
                </span>
                <span className={checked ? "text-mute line-through" : ""}>{step}</span>
              </label>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs leading-5 text-mute">
        Centang hanya disimpan di perangkat ini sebagai catatan pribadi, bukan status pemasangan dari server.
      </p>
    </section>
  );
}
