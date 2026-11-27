import { CornerDownRight, GitBranch } from "lucide-react";
import { IconForStatus } from "@/components/StatusIcon";
import { jam } from "@/lib/format";
import { STATUS_META, type Status } from "@/lib/status";

type EventRow = { status: string; note: string | null; created_at: string | Date };

const MAIN: { status: Status; desc: string }[] = [
  { status: "menunggu", desc: "Brief diterima, lalu kami cek detail dan harga." },
  { status: "dikerjakan", desc: "Desain/cetak berjalan sesuai spesifikasi." },
  { status: "selesai", desc: "File final siap dan dikirim ke kamu." },
];

const BRANCH_AFTER: Record<string, Status> = {
  menunggu: "batal",
  dikerjakan: "revisi",
};

export function StatusTree({
  status,
  events = [],
  note,
}: {
  status: Status;
  events?: EventRow[];
  note?: string | null;
}) {
  const mainIndex = MAIN.findIndex((s) => s.status === status);
  // Revisi dan batal tetap menempel pada cabangnya masing-masing.
  const activeIndex = status === "revisi" ? 1 : status === "batal" ? 0 : mainIndex;

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">
        <GitBranch aria-hidden className="size-3.5" /> Alur pesanan
      </div>
      <ol className="relative ml-1 animate-in">
        {MAIN.map((step, index) => {
          const meta = STATUS_META[step.status];
          const state =
            status === "batal" && index === 0
              ? "done"
              : index < activeIndex
                ? "done"
                : index === activeIndex && mainIndex >= 0
                  ? "active"
                  : "idle";
          const isActive = state === "active";
          const stepEvents = events.filter((e) => e.status === step.status);
          const branch = BRANCH_AFTER[step.status] as Status | undefined;
          const branchMeta = branch ? STATUS_META[branch] : null;
          const branchEvents = branch ? events.filter((e) => e.status === branch) : [];
          const branchActive = branch === status;
          // Garis penghubung mengikuti tujuan proses: menunggu -> dikerjakan = kuning -> biru.
          const next = MAIN[index + 1];
          const lineTarget =
            branch && branchMeta && branchActive
              ? branchMeta.color
              : next
                ? STATUS_META[next.status].color
                : meta.color;
          const lineGradient = `linear-gradient(180deg, ${meta.color}, ${lineTarget})`;

          return (
            <li key={step.status} className="relative pb-5 pl-12 last:pb-0">
              {index < MAIN.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute bottom-1 left-[19px] top-11 w-px rounded-full transition-[background] duration-500 ${state === "done" ? "flow-line" : ""}`}
                  style={{
                    background: state === "done" ? lineGradient : "var(--border)",
                    backgroundSize: state === "done" ? "100% 200%" : undefined,
                  }}
                />
              )}
              <span
                aria-hidden
                className={`absolute left-0 top-0 z-10 grid size-10 place-items-center rounded-full border transition-colors ${isActive ? "animate-pulse" : ""}`}
                style={{
                  color: state === "idle" ? "var(--text-3)" : meta.color,
                  borderColor: state === "idle" ? "var(--border)" : `color-mix(in srgb, ${meta.color} 45%, transparent)`,
                  background: state === "idle" ? "var(--panel)" : meta.soft,
                }}
              >
                <IconForStatus status={step.status} className="size-[18px]" />
              </span>

              <div
                key={`${step.status}-${isActive ? "in" : "out"}`}
                className={`rounded-tag-sm border px-4 py-3 transition-colors ${isActive ? "animate-in" : ""}`}
                style={{
                  borderColor: isActive ? `color-mix(in srgb, ${meta.color} 40%, transparent)` : "var(--border)",
                  background: isActive ? meta.soft : "transparent",
                  transition: "background 0.45s ease, border-color 0.45s ease",
                }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className={`text-sm font-semibold ${isActive ? "" : "text-ink/75"}`} style={isActive ? { color: meta.color } : undefined}>
                    {meta.label}
                  </p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                    {state === "done" ? "selesai" : isActive ? "saat ini" : "belum"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-mute">{step.desc}</p>
                {isActive && note && <p className="mt-2 text-xs leading-5 text-ink/80">{note}</p>}
                {stepEvents.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-line/70 pt-2.5">
                    {stepEvents.map((event, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs text-mute">
                        <span className="tabular-nums">{jam(event.created_at)}</span>
                        {event.note && <span className="text-ink/70">{event.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {branch && branchMeta && (
                <div className="relative ml-4 mt-2 border-l border-dashed border-line pl-6">
                  <span aria-hidden className="absolute -left-px top-0 h-5 w-5 rounded-bl-[12px] border-b border-l border-line" />
                  <div
                    key={branchActive ? "branch-in" : "branch-out"}
                    className={`flex flex-wrap items-center gap-2 rounded-tag-sm border px-3 py-2 transition-colors ${branchActive ? "animate-in" : ""}`}
                    style={{
                      borderColor: branchActive ? `color-mix(in srgb, ${branchMeta.color} 40%, transparent)` : "var(--border)",
                      background: branchActive ? branchMeta.soft : "transparent",
                      color: branchActive ? branchMeta.color : "var(--text-3)",
                      transition: "background 0.45s ease, border-color 0.45s ease",
                    }}
                  >
                    <CornerDownRight aria-hidden className="size-3.5" />
                    <IconForStatus status={branch} className="size-3.5" />
                    <span className="text-xs font-semibold">{branchMeta.label}</span>
                    <span className="ml-auto text-[11px] uppercase tracking-[0.1em] opacity-70">
                      {branchActive ? "saat ini" : "cabang"}
                    </span>
                  </div>
                  {branchEvents.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-mute">
                      {branchEvents.map((event, i) => (
                        <li key={i} className="flex flex-wrap gap-x-2">
                          <span className="tabular-nums">{jam(event.created_at)}</span>
                          {event.note && <span className="text-ink/70">{event.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
