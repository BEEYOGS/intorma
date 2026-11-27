import { ClipboardList, Layers3, Settings2 } from "lucide-react";
import { GridStat } from "@/components/GridStat";
import { TopBar } from "@/components/TopBar";
import { LatestJobs } from "@/components/LatestJobs";
import { getLatestJobs, getProductStats } from "@/lib/data";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { gatewayEnabled } from "@/lib/payment";
import { waDiagnostics } from "@/lib/wa";
import { redirect } from "next/navigation";

const WA_LABEL: Record<string, string> = {
  cloud: "Meta Cloud API",
  fonnte: "Fonnte (hosted)",
  openwa: "OpenWA (self-hosted)",
};

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [stats, jobs, wa, dbOk] = await Promise.all([
    getProductStats(),
    getLatestJobs(),
    waDiagnostics().catch(() => null),
    sql`select 1`.then(() => true).catch(() => false),
  ]);
  const waReady = Boolean(wa?.configured && wa.gatewayReachable && wa.sessionStatus === "ready");
  const status = [
    { label: "Pembayaran online", ok: gatewayEnabled(), on: "aktif", off: "nonaktif" },
    { label: "Database", ok: dbOk, on: "terhubung", off: "gagal" },
    {
      label: wa?.provider ? `WhatsApp (${WA_LABEL[wa.provider] ?? wa.provider})` : "WhatsApp",
      ok: waReady,
      on: "siap",
      off: "belum siap",
    },
  ];

  return (
    <div className="animate-in">
      <TopBar isAdmin />
      <div className="wrap py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="eyebrow mb-1">Dashboard</p>
            <h1 className="display text-2xl sm:text-3xl">Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-xs text-[var(--text-3)]">admin session</span>
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          </div>
        </div>

        <div className="mb-8">
          <GridStat stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LatestJobs jobs={jobs} />
          </div>
          <div className="space-y-4">
            <div className="card p-5">
              <p className="eyebrow mb-3">Quick actions</p>
              <div className="space-y-2">
                <a href="/admin" className="btn btn-ghost w-full text-sm">
                  <ClipboardList aria-hidden className="size-4" /> Kelola pesanan
                </a>
                <a href="/admin/layanan" className="btn btn-ghost w-full text-sm">
                  <Layers3 aria-hidden className="size-4" /> Kelola layanan
                </a>
                <a href="/admin/pengaturan" className="btn btn-ghost w-full text-sm">
                  <Settings2 aria-hidden className="size-4" /> Pengaturan
                </a>
              </div>
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-3">Status</p>
              <div className="space-y-2 text-sm">
                {status.map((item) => (
                  <div key={item.label} className="flex justify-between gap-3">
                    <span className="text-[var(--text-2)]">{item.label}</span>
                    <span className={`mono ${item.ok ? "text-[var(--accent)]" : "text-[var(--red)]"}`}>
                      {item.ok ? item.on : item.off}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-line pt-3 text-[11px] leading-5 text-mute">
                Provider: {wa?.provider ? WA_LABEL[wa.provider] ?? wa.provider : "—"}
                {!waReady && wa?.error ? ` · ${wa.error}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}