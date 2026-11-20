import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { RegMark } from "@/components/Press";
import { SettingsForm } from "@/components/SettingsForm";
import { isAdmin } from "@/lib/auth";
import { normalizeWA } from "@/lib/format";
import { getPaymentSettings } from "@/lib/settings";
import { waDisplay } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan", robots: { index: false } };

export default async function SettingsAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const payment = await getPaymentSettings();
  const envWa = normalizeWA(process.env.ADMIN_WA ?? "");
  const waNumber = envWa ? `+${envWa}` : waDisplay;

  return (
    <AdminShell active="settings">
      <div>
        <p className="eyebrow flex items-center gap-2.5">
          <RegMark className="size-3.5 text-steel" />
          Admin
        </p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Pengaturan</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
          Rekening pembayaran dan info yang tampil ke klien.
        </p>
      </div>

      <section className="mt-9">
        <h2 className="text-lg font-semibold tracking-tight">Pembayaran</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-mute">
          Tampil di beranda, halaman lacak, dan pesan WhatsApp saat harga pesanan dikonfirmasi.
        </p>
        <div className="mt-6">
          <SettingsForm initial={payment} waNumber={waNumber} />
        </div>
      </section>

      <section className="mt-12 max-w-2xl rounded-tag-lg border border-line bg-panel/40 p-5 text-sm leading-6 text-mute">
        <p className="font-semibold text-ink">Kalau transfer belum masuk</p>
        <p className="mt-1">
          Biarkan “Pembayaran sudah masuk” tidak dicentang di pesanan. Halaman lacak klien akan
          menampilkan status belum dibayar beserta nomor rekening.
        </p>
      </section>
    </AdminShell>
  );
}
