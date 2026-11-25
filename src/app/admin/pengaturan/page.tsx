import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SettingsForm } from "@/components/SettingsForm";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { isAdmin } from "@/lib/auth";
import { getPaymentSettings } from "@/lib/settings";
import { waDisplay } from "@/lib/site";
import { adminWhatsApp, waDiagnostics } from "@/lib/wa";
import { sql } from "@/lib/db";
import { toggleReminders } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan", robots: { index: false } };

async function toggleRemindersAction(formData: FormData) {
  "use server";
  await toggleReminders(null, formData);
}

export default async function SettingsAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [payment, wa] = await Promise.all([
    getPaymentSettings(),
    waDiagnostics().catch(() => null),
  ]);
  const reminderRow = (await sql`select value from app_settings where key = 'reminder_enabled'`)[0];
  const reminderEnabled = String(reminderRow?.value ?? "0") === "1";

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
          <span className="mono">status INT-DDMMYY001</span>.
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

      <section className="mt-12 max-w-2xl rounded-tag-lg border border-line bg-panel/40 p-5">
        <h2 className="text-lg font-semibold tracking-tight">Pengingat deadline otomatis</h2>
        <p className="mt-1 text-sm leading-6 text-mute">
          Setiap hari jam 09:00 WIB, kirim WhatsApp ke pelanggan yang pesanannya belum selesai/bayar dan
          deadline dalam 2 hari atau sudah lewat.
        </p>
        <form action={toggleRemindersAction} className="mt-4 flex flex-wrap items-center gap-3">
          <label className="block cursor-pointer">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={reminderEnabled}
              className="peer sr-only"
            />
            <span className="check-tile peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              <span aria-hidden className="check-box">✓</span>
              <span className="text-sm font-semibold">
                {reminderEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </span>
          </label>
          <button type="submit" className="btn-outline min-h-10 px-4 text-sm">
            Simpan
          </button>
        </form>
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
