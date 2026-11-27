"use client";

import { useEffect, useRef, useState } from "react";
import { wibToday } from "@/lib/deadline";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function parseISO(value: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value: string) {
  const date = parseISO(value);
  if (!date) return "";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[1.1rem] shrink-0">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      {dir === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

export function DateField({
  name,
  defaultValue = "",
  placeholder = "Pilih tanggal",
  min,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  min?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const start = parseISO(defaultValue) ?? (min ? parseISO(min) : null) ?? new Date();
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) selectedRef.current?.focus();
  }, [open]);

  // Semua perhitungan tanggal memakai WIB supaya sama dengan validasi server.
  const todayISO = wibToday();
  const firstDow = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const dayCount = new Date(view.year, view.month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDow + 1;
    return day >= 1 && day <= dayCount ? day : null;
  });

  function moveMonth(delta: number) {
    setView((current) => {
      let month = current.month + delta;
      let year = current.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  }

  function choose(date: string) {
    setValue(date);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggle() {
    if (!open) {
      const base = parseISO(value) ?? new Date();
      setView({ year: base.getFullYear(), month: base.getMonth() });
    }
    setOpen((current) => !current);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="field flex items-center justify-between gap-3 text-left"
      >
        <span className={value ? "tabular-nums" : "text-ink/50"}>{value ? formatDisplay(value) : placeholder}</span>
        <span className="text-ink/45">
          <CalendarIcon />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pilih tanggal"
          className="absolute left-0 right-0 z-30 mt-2 rounded-tag-sm border border-line bg-panel p-4 shadow-[0_18px_40px_-24px_rgba(11,11,11,0.45)]"
        >
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya" className="grid size-10 place-items-center rounded-tag-sm text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
              <Arrow dir="left" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold">
              {MONTHS[view.month]} {view.year}
            </p>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya" className="grid size-10 place-items-center rounded-tag-sm text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
              <Arrow dir="right" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} aria-hidden="true" className="grid h-7 place-items-center text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (day === null) return <span key={`kosong-${index}`} aria-hidden="true" />;
              const iso = toISO(view.year, view.month, day);
              const selected = value === iso;
              const isToday = todayISO === iso;
              const past = iso < todayISO;
              const blocked = past || (min ? iso < min : false);
              return (
                <button
                  key={iso}
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  onClick={() => !blocked && choose(iso)}
                  disabled={blocked}
                  aria-disabled={blocked || undefined}
                  aria-pressed={selected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${day} ${MONTHS[view.month]} ${view.year}${blocked ? " (belum tersedia)" : ""}`}
                  className={`grid size-9 place-items-center rounded-tag-sm text-[13px] font-medium tabular-nums transition-colors ${
                    blocked
                      ? "cursor-not-allowed text-ink/25"
                      : selected
                        ? "bg-ink text-paper"
                        : `text-ink/75 hover:bg-ink/5 hover:text-ink ${isToday ? "border border-ink/30" : ""}`
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <button type="button" onClick={() => choose("")} disabled={!value} className="text-xs font-semibold text-ink/55 transition-colors hover:text-ink disabled:opacity-35">
              Hapus
            </button>
            <button
              type="button"
              onClick={() => choose(min && min > todayISO ? min : todayISO)}
              className="text-xs font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
            >
              {min && min > todayISO ? "Tanggal tercepat" : "Hari ini"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
