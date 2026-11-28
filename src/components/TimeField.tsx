"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function normalize(value: string | undefined): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!match) return [17, 0];
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  const snapped = Math.round(minute / 5) * 5;
  return [hour, snapped === 60 ? 55 : snapped];
}

function to24(hour12: number, period: "AM" | "PM") {
  const base = hour12 % 12;
  return period === "PM" ? base + 12 : base;
}

function to12(hour24: number): { hour: number; period: "AM" | "PM" } {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return { hour, period };
}

const SIZE = 232;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 30;
const BTN = 34;

function polar(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

export function TimeField({ name, defaultValue = "17:00" }: { name: string; defaultValue?: string }) {
  const [h24, m] = normalize(defaultValue);
  const initial = to12(h24);
  const [hour12, setHour12] = useState(initial.hour);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [minute, setMinute] = useState(m);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [open, setOpen] = useState(false);
  useOverlayRegistration("time-field", open, () => setOpen(false));
  const rootRef = useRef<HTMLDivElement>(null);

  const hour24 = to24(hour12, period);
  const value = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectHour(next: number) {
    setHour12(next);
    window.setTimeout(() => setMode("minute"), 180);
  }

  function selectMinute(next: number) {
    setMinute(next);
  }

  const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteNumbers = MINUTES;

  const selectedHourIndex = hourNumbers.indexOf(hour12);
  const selectedMinuteIndex = minuteNumbers.indexOf(minute);

  const hourPos = selectedHourIndex >= 0 ? polar(selectedHourIndex, 12) : null;
  const minutePos = selectedMinuteIndex >= 0 ? polar(selectedMinuteIndex, 12) : null;

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
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
          role="dialog"
          aria-label="Pilih jam"
          className="absolute left-0 z-30 mt-2 w-[17rem] rounded-tag-sm border border-line bg-panel p-4 shadow-[0_18px_40px_-24px_rgba(11,11,11,0.45)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-tag-sm border border-line bg-panel/60 p-1">
              <button
                type="button"
                onClick={() => setMode("hour")}
                className={`min-h-8 rounded-tag-sm px-3 text-xs font-semibold transition-colors ${
                  mode === "hour" ? "bg-accent text-white" : "text-mute hover:text-ink"
                }`}
              >
                Jam
              </button>
              <button
                type="button"
                onClick={() => setMode("minute")}
                className={`min-h-8 rounded-tag-sm px-3 text-xs font-semibold transition-colors ${
                  mode === "minute" ? "bg-accent text-white" : "text-mute hover:text-ink"
                }`}
              >
                Menit
              </button>
            </div>
            <div className="inline-flex rounded-tag-sm border border-line bg-panel/60 p-1">
              <button
                type="button"
                onClick={() => setPeriod("AM")}
                className={`min-h-8 rounded-tag-sm px-3 text-xs font-semibold transition-colors ${
                  period === "AM" ? "bg-accent text-white" : "text-mute hover:text-ink"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setPeriod("PM")}
                className={`min-h-8 rounded-tag-sm px-3 text-xs font-semibold transition-colors ${
                  period === "PM" ? "bg-accent text-white" : "text-mute hover:text-ink"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
            <div className="absolute inset-0 rounded-full border border-line bg-panel/60" />
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0"
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
            >
              {(mode === "hour" ? hourPos : minutePos) && (
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={mode === "hour" ? hourPos!.x : minutePos!.x}
                  y2={mode === "hour" ? hourPos!.y : minutePos!.y}
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              <circle cx={CENTER} cy={CENTER} r="4" fill="var(--accent)" />
            </svg>

            {(mode === "hour" ? hourNumbers : minuteNumbers).map((num, index, arr) => {
              const total = arr.length;
              const pos = polar(index, total);
              const selected = mode === "hour" ? num === hour12 : num === minute;
              const label = mode === "hour" ? String(num) : String(num).padStart(2, "0");
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => (mode === "hour" ? selectHour(num) : selectMinute(num))}
                  aria-label={mode === "hour" ? `Jam ${label}` : `Menit ${label}`}
                  className={`absolute grid place-items-center rounded-full text-xs font-semibold transition-colors ${
                    selected ? "bg-accent text-white" : "text-mute hover:bg-white/[0.06] hover:text-ink"
                  }`}
                  style={{
                    width: BTN,
                    height: BTN,
                    left: pos.x - BTN / 2,
                    top: pos.y - BTN / 2,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="mono text-sm font-semibold tabular-nums">{value}</span>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary min-h-9 px-3 text-xs">
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
