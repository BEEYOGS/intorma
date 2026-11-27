import type { ProductStats } from "@/lib/data";
import { STATUS_META, type Status } from "@/lib/status";

// `selesi` adalah nama kolom lama di database; tampilan memakai "Selesai".
const STAT_LABELS: Array<{ key: keyof ProductStats; label: string; status: Status }> = [
  { key: "services", label: "Layanan", status: "dikerjakan" },
  { key: "orders", label: "Pesanan", status: "dikerjakan" },
  { key: "menunggu", label: "Menunggu", status: "menunggu" },
  { key: "dikerjakan", label: "Dikerjakan", status: "dikerjakan" },
  { key: "selesi", label: "Selesai", status: "selesai" },
];

export function GridStat({ stats }: { stats: ProductStats }) {
  return (
    <div className="grid-stat rounded-tag border border-border bg-panel/50 p-4">
      {STAT_LABELS.map((s) => (
        <div key={s.key} className="rounded-tag border border-border bg-panel/60 p-4 sm:p-5">
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{s.label}</span>
          <span
            className="mt-1 block font-mono text-3xl font-bold tracking-tight text-ink"
            style={{ color: STATUS_META[s.status].color }}
          >
            {stats[s.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
