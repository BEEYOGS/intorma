import { jobStatusColor } from "@/lib/job";
import { tanggal } from "@/lib/format";
import { STATUS_META, asStatus } from "@/lib/status";
import { IconForStatus } from "@/components/StatusIcon";
import type { LatestJob } from "@/lib/data";

export function LatestJobs({ jobs }: { jobs: LatestJob[] }) {
  if (!jobs.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--text-3)]">Belum ada pesanan.</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <p className="eyebrow">Aktivitas terbaru</p>
        <h2 className="text-[15px] font-medium text-[var(--text)] mt-1">Pesanan terbaru</h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Status</th>
            <th>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const status = asStatus(job.status);
            return (
              <tr key={job.id}>
                <td className="mono text-[var(--text)] font-medium">{job.code}</td>
                <td>{job.name}</td>
                <td>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold"
                    style={{
                      color: jobStatusColor(job.status),
                      borderColor: `color-mix(in srgb, ${jobStatusColor(job.status)} 35%, transparent)`,
                      background: STATUS_META[status].soft,
                    }}
                  >
                    <IconForStatus status={status} className="size-3.5" />
                    {STATUS_META[status].short}
                  </span>
                </td>
                <td className="mono text-xs text-[var(--text-3)]">{tanggal(job.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
