import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OptionEditor } from "@/components/OptionEditor";
import { ServiceForm } from "@/components/ServiceForm";
import { ServiceIconTile } from "@/components/ServiceIcon";
import { DeleteServiceButton } from "@/components/DeleteServiceButton";
import { ChevronRight, Layers3, Plus } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { getAllServicesWithOptions, sql } from "@/lib/db";
import { priceLabel } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Layanan", robots: { index: false } };

export default async function ServicesAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [services, usage] = await Promise.all([
    getAllServicesWithOptions(),
    sql`select service_id, count(*)::int as n from orders where service_id is not null group by service_id`,
  ]);
  const active = services.filter((s) => s.active).length;
  const orderCount = (id: string) => Number(usage.find((row) => row.service_id === id)?.n ?? 0);

  return (
    <AdminShell active="services">
      <div>
        <p className="eyebrow flex items-center gap-2"><Layers3 aria-hidden className="size-3.5" /> Admin · Katalog</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Layanan &amp; harga</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
          Atur harga dasar, model hitung, minimum order, dan pembulatan. Opsi bahan/finishing
          mengikuti katalog layanan dan otomatis dihitung di halaman pesan.
        </p>
      </div>

      <details className="group mt-8 rounded-tag-lg border border-line bg-panel/50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <span className="flex items-center gap-2.5 font-semibold">
            <span aria-hidden className="grid size-7 place-items-center rounded-tag-sm border border-line bg-white/[0.04]">
              <Plus className="size-4" />
            </span>
            Tambah layanan
          </span>
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
                <ServiceIconTile service={s} />
                <span className="min-w-[10rem] flex-1">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-xs leading-5 text-mute">{s.blurb}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {priceLabel(s)}
                </span>
                <span className="tag">
                  {s.pricing_model === "area" ? "Per m┬▓" : s.pricing_model === "per_unit" ? "Per item" : "Paket"}
                </span>
                <span className="text-xs text-mute">┬▒ {s.days} hari</span>
                <span className={`tag ${s.active ? "!border-[#0070f3]/35 !text-[#3291ff]" : ""}`}>
                  <span aria-hidden className="status-dot !mr-0" style={{ background: s.active ? "#0070f3" : "var(--text-3)" }} />
                  {s.active ? "Aktif" : "Nonaktif"}
                </span>
                <span className="text-xs text-mute">{orderCount(s.id)} pesanan</span>
                <span aria-hidden className="text-ink/30 transition-transform group-open:rotate-90">
                  <ChevronRight className="size-4" />
                </span>
              </summary>
              <div className="border-t border-line px-5 py-6">
                <ServiceForm service={s} />
                <div className="mt-6">
                  <OptionEditor service={s} />
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-tag-sm border border-danger/20 bg-danger/[0.03] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-danger">Hapus layanan</p>
                    <p className="mt-1 text-xs leading-5 text-mute">
                      Grup opsi ikut terhapus. Riwayat pesanan tetap menyimpan nama layanan ini.
                    </p>
                  </div>
                  <DeleteServiceButton id={s.id} name={s.name} orders={orderCount(s.id)} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <p className="mt-6 max-w-xl text-xs leading-5 text-mute">
        Untuk menyembunyikan layanan sementara, hilangkan centangan “Tampilkan”. Gunakan “Hapus” hanya
        untuk menghapus layanan beserta opsinya; nama layanan tetap tersimpan di pesanan lama.
      </p>
    </AdminShell>
  );
}
