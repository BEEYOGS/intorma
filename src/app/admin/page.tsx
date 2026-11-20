import { AdminTopBar } from "@/components/AdminTopBar";

export default function AdminPage() {
  return (
    <div className="animate-in">
      <AdminTopBar />
      <div className="wrap py-8">
        <div className="mb-8">
          <p className="eyebrow mb-1">Admin</p>
          <h1 className="display text-2xl sm:text-3xl">Panel administrasi</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/dashboard" className="card p-6 card-hover">
            <p className="eyebrow mb-2">Dashboard</p>
            <p className="text-sm text-[var(--text-2)]">Overview pesanan dan statistik.</p>
          </a>
          <a href="/admin/layanan" className="card p-6 card-hover">
            <p className="eyebrow mb-2">Layanan</p>
            <p className="text-sm text-[var(--text-2)]">Kelola layanan dan harga.</p>
          </a>
          <a href="/admin/pengaturan" className="card p-6 card-hover">
            <p className="eyebrow mb-2">Pengaturan</p>
            <p className="text-sm text-[var(--text-2)]">Rekening dan catatan transfer.</p>
          </a>
        </div>
      </div>
    </div>
  );
}