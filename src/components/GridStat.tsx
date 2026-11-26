import type { ProductStats } from "@/lib/data";

const STAT_LABELS: Array<{ key: keyof ProductStats; label: string; color?: string }> = [
  { key: "services", label: "Services", color: "#10b981" },
  { key: "orders", label: "Orders", color: "#10b981" },
  { key: "menunggu", label: "Pending", color: "#f59e0b" },
  { key: "dikerjakan", label: "In progress", color: "#3b82f6" },
  { key: "selesi", label: "Done", color: "#10b981" },
];

export function GridStat({ stats }: { stats: ProductStats }) {
  return (
    <div className="grid-stat rounded-lg border border-border bg-panel/50 p-4">
      {STAT_LABELS.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-panel/60 p-4 sm:p-5">
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{s.label}</span>
          <span className="mt-1 block font-mono text-3xl font-bold tracking-tight text-ink" style={{ color: s.color }}>
            {stats[s.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
