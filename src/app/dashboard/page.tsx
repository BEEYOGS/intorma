import { GridStat } from "@/components/GridStat";
import { TopBar } from "@/components/TopBar";
import { LatestJobs } from "@/components/LatestJobs";
import { getLatestJobs, getProductStats } from "@/lib/data";
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const stats = await getProductStats();
  const jobs = await getLatestJobs();

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
            <span className="w-2 h-2 rounded-full bg-[var(--jade)]"></span>
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
                <a href="/admin" className="btn btn-ghost w-full text-sm">Kelola pesanan</a>
                <a href="/admin/layanan" className="btn btn-ghost w-full text-sm">Kelola layanan</a>
                <a href="/admin/pengaturan" className="btn btn-ghost w-full text-sm">Pengaturan</a>
              </div>
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-3">Status</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-2)]">Gateway</span>
                  <span className="mono text-[var(--jade)]">online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-2)]">Database</span>
                  <span className="mono text-[var(--jade)]">connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-2)]">WhatsApp</span>
                  <span className="mono text-[var(--jade)]">ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}