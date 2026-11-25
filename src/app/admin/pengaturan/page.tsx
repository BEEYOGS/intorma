import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SettingsForm } from "@/components/SettingsForm";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { isAdmin } from "@/lib/auth";
import { getPaymentSettings } from "@/lib/settings";
import { waDisplay } from "@/lib/site";
import { adminWhatsApp, waDiagnostics } from "@/lib/wa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan", robots: { index: false } };

export default async function SettingsAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [payment, wa] = await Promise.all([
    getPaymentSettings(),
    waDiagnostics().catch(() => null),
  ]);

  return (
    <AdminShell active="settings">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Pengaturan</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
          Rekening pembayaran, status WhatsApp, dan info yang tampil ke klien.
        </p>
      </div>

      <section className="mt-9">
        <h2 className="text-lg font-semibold tracking-tight">Pembayaran</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-mute">
          Tampil di beranda, halaman lacak, dan pesan WhatsApp saat harga pesanan dikonfirmasi.
        </p>
        <div className="mt-6">
          <SettingsForm initial={payment} waNumber={waDisplay} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">WhatsApp</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-mute">
          Notifikasi pesanan baru, perubahan status, dan balasan otomatis{" "}
          <span className="mono">status INT-XXXXXX</span>.
        </p>
        <div className="mt-6">
          <WhatsAppStatus
            provider={wa?.provider ?? "openwa"}
            configured={Boolean(wa?.configured)}
            ready={Boolean(wa?.configured && wa.gatewayReachable && wa.sessionStatus === "ready")}
            device={wa?.sessionId ?? null}
            quota={wa?.quota}
            expired={wa?.expired}
            error={wa ? wa.error : "Diagnostik WhatsApp gagal dimuat."}
            adminNumber={adminWhatsApp()}
          />
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
