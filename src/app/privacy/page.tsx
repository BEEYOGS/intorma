import { TopBar } from "@/components/TopBar";

export const metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-10 sm:py-14">
        <p className="eyebrow mb-2">Legal</p>
        <h1 className="display text-2xl sm:text-3xl">Kebijakan Privasi</h1>
        <p className="mt-2 text-sm text-mute">Terakhir diperbarui: 23 November 2026</p>

        <div className="mt-8 max-w-3xl space-y-6 text-sm leading-7 text-[var(--text-2)]">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Data yang kami kumpulkan</h2>
            <p>
              Saat kamu memesan, kami menyimpan nama, nomor WhatsApp, alamat email (jika membuat akun),
              detail pesanan, pilihan layanan, dan file yang kamu unggah. Data ini dipakai untuk memproses,
              melacak, dan mengirim kabar pesanan.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Penyimpanan file</h2>
            <p>
              File yang kamu unggah tersimpan di penyimpanan aplikasi atau, bila fitur diaktifkan, di
              Google Drive milik kami. File hanya bisa diakses lewat endpoint aplikasi setelah sesi
              akun kamu terverifikasi. Kami tidak menjadikan file kamu publik.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">WhatsApp</h2>
            <p>
              Nomor WhatsApp dipakai untuk mengirim kode pesanan, rincian harga, dan kabar progres.
              Kami tidak menjual atau membagikan nomor kamu ke pihak ketiga.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Pembayaran</h2>
            <p>
              Pembayaran diproses melalui transfer bank manual atau, bila tersedia, penyedia pembayaran
              pihak ketiga. in.torma tidak menyimpan nomor kartu kredit atau data pembayaran sensitif.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Hak kamu</h2>
            <p>
              Kamu bisa meminta akses, pembetulan, atau penghapusan data dengan menghubungi kami lewat
              WhatsApp di halaman kontak.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
