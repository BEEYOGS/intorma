"use client";

import { useState } from "react";
import { rupiah, tanggal } from "@/lib/format";

type Row = { day: string; n: number; revenue: number };

export function DailyChart({ rows }: { rows: Row[] }) {
  const [metric, setMetric] = useState<"count" | "revenue">("count");
  const value = (row: Row) => (metric === "count" ? row.n : row.revenue);
  const max = Math.max(1, ...rows.map(value));
  const label = (row: Row) =>
    metric === "count" ? `${row.n} pesanan` : rupiah(row.revenue);

  return (
    <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Pesanan per hari</h2>
        <div className="flex items-center gap-1 rounded-tag-sm border border-line p-0.5" role="group" aria-label="Metrik grafik">
          {([
            ["count", "Jumlah"],
            ["revenue", "Pendapatan"],
          ] as const).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={metric === key}
              className={`inline-flex min-h-10 items-center rounded-[5px] px-2.5 text-xs font-semibold transition-colors ${
                metric === key ? "bg-accent/15 text-accent" : "text-mute hover:text-[var(--text)]"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-mute">{rows.length} hari · maksimum {metric === "count" ? max : rupiah(max)}</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-mute">Belum ada data.</p>
      ) : (
        <div className="mt-6 flex items-end gap-1.5 overflow-x-auto pb-2">
          {rows.map((row) => {
            const current = value(row);
            const height = Math.max(4, Math.round((current / max) * 96));
            return (
              <div key={row.day} className="flex min-w-[2rem] flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-accent/70"
                  style={{ height: `${height}px` }}
                  title={`${tanggal(row.day)}: ${label(row)}`}
                />
                <span className="text-xs text-mute">{row.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
