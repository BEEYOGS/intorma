import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { RegMark } from "@/components/Press";
import { ServiceForm } from "@/components/ServiceForm";
import { isAdmin } from "@/lib/auth";
import { getAllServices } from "@/lib/db";
import { priceLabel } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Layanan", robots: { index: false } };

export default async function ServicesAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const services = await getAllServices();
  const active = services.filter((s) => s.active).length;

  return (
    <AdminShell active="services">
      <div>
        <p className="eyebrow flex items-center gap-2.5">
          <RegMark className="size-3.5 text-silver" />
          Admin
        </p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Layanan &amp; harga</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
          Atur item yang tampil di halaman pesan. Harga di sini adalah harga awal; harga final per
          pesanan tetap bisa disesuaikan di halaman pesanan.
        </p>
      </div>

      <details className="group mt-8 rounded-tag-lg border border-line bg-panel/50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <span className="font-semibold">Tambah layanan</span>
          <span aria-hidden className="text-xl font-normal text-ink/35 transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="border-t border-line px-5 py-6">
          <ServiceForm />
        </div>
      </details>

      <div className="mt-9 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Daftar layanan</h2>
        <p className="text-sm text-mute">{active} aktif dari {services.length} layanan</p>
      </div>

      {services.length === 0 ? (
        <p className="mt-4 rounded-tag-lg border border-dashed border-line p-8 text-center text-sm text-mute">
          Belum ada layanan. Tambahkan yang pertama di atas.
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {services.map((s) => (
            <details key={s.id} className={`group rounded-tag-lg border border-line bg-panel/40 ${s.active ? "" : "opacity-75"}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-sand/50">
                <span className="min-w-[12rem] flex-1">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-xs leading-5 text-mute">{s.blurb}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {priceLabel(s)}
                </span>
                <span className="tag">{s.pricing_mode === "per_unit" ? "Per item" : "Tetap"}</span>
                <span className="text-xs text-mute">± {s.days} hari</span>
                <span className="tag">{s.active ? "Aktif" : "Nonaktif"}</span>
                <span className="font-mono text-[11px] text-mute">urutan {s.sort}</span>
                <span aria-hidden className="text-ink/30 transition-transform group-open:rotate-90">→</span>
              </summary>
              <div className="border-t border-line px-5 py-6">
                <ServiceForm service={s} />
              </div>
            </details>
          ))}
        </div>
      )}

      <p className="mt-6 max-w-xl text-xs leading-5 text-mute">
        Menghilangkan centang “Tampilkan” akan menyembunyikan layanan dari situs tanpa menghapus riwayat
        pesanan yang memakainya.
      </p>
    </AdminShell>
  );
}
