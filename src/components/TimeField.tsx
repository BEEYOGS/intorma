"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function normalize(value: string | undefined): [string, string] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!match) return ["17", "00"];
  const hour = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, "0");
  const minute = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, "0");
  // Snap ke kelipatan 5 menit terdekat untuk konsistensi pilihan.
  const snapped = String(Math.round(Number(minute) / 5) * 5).padStart(2, "0");
  return [hour, snapped === "60" ? "55" : snapped];
}

export function TimeField({ name, defaultValue = "17:00" }: { name: string; defaultValue?: string }) {
  const [hour, setHour] = useState(() => normalize(defaultValue)[0]);
  const [minute, setMinute] = useState(() => normalize(defaultValue)[1]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLButtonElement>(null);
  const minuteRef = useRef<HTMLButtonElement>(null);

  const value = `${hour}:${minute}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedHour = rootRef.current?.querySelector<HTMLButtonElement>(`button[data-hour="${hour}"]`);
    const selectedMinute = rootRef.current?.querySelector<HTMLButtonElement>(`button[data-minute="${minute}"]`);
    selectedHour?.scrollIntoView({ block: "nearest" });
    selectedMinute?.scrollIntoView({ block: "nearest" });
  }, [open, hour, minute]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex min-h-12 items-center justify-between gap-3 text-left"
      >
        <span className="mono tabular-nums text-lg font-semibold">{value}</span>
        <span className="flex items-center gap-2 text-mute">
          <Clock aria-hidden className="size-4" />
          <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Pilih jam dan menit"
          className="absolute left-0 z-30 mt-2 w-full max-w-[16rem] rounded-tag-sm border border-line bg-panel p-3 shadow-[0_18px_40px_-24px_rgba(11,11,11,0.45)]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="time-picker-scroll max-h-44 overflow-y-auto pr-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Jam</p>
              <div className="grid grid-cols-4 gap-1.5">
                {HOURS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-hour={item}
                    onClick={() => setHour(item)}
                    aria-selected={item === hour}
                    className={`grid size-9 place-items-center rounded-tag-sm text-xs font-semibold transition-colors ${
                      item === hour
                        ? "bg-accent text-white"
                        : "border border-line text-mute hover:border-accent/40 hover:text-ink"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-picker-scroll max-h-44 overflow-y-auto pr-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Menit</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-minute={item}
                    onClick={() => setMinute(item)}
                    aria-selected={item === minute}
                    className={`grid size-9 place-items-center rounded-tag-sm text-xs font-semibold transition-colors ${
                      item === minute
                        ? "bg-accent text-white"
                        : "border border-line text-mute hover:border-accent/40 hover:text-ink"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="mono text-xs text-mute">{value}</span>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary min-h-9 px-3 text-xs">
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
