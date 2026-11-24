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
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Pengantar</h2>
            <p>
              in.torma adalah layanan desain dan cetak yang dioperasikan oleh lucky77ag@gmail.com.
              Kebijakan ini menjelaskan data apa yang kami kumpulkan, mengapa kami mengumpulkannya,
              bagaimana kami menggunakannya, dengan siapa kami membagikannya, berapa lama kami
              menyimpannya, dan apa hak kamu atas data tersebut. Kebijakan ini berlaku untuk seluruh
              pengunjung situs, pelanggan yang membuat pesanan, dan pengguna portal klien.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Data yang kami kumpulkan</h2>
            <p>
              Saat kamu memesan, kami menyimpan nama, nomor WhatsApp, alamat email (jika membuat akun),
              detail pesanan, pilihan layanan, ukuran dan finishing, rincian harga, status pembayaran,
              dan file yang kamu unggah. Saat kamu mengunjungi situs, kami juga dapat menerima data
              teknis standar seperti alamat IP, jenis browser, dan halaman yang dibuka melalui log
              server dan penyedia hosting. Kami tidak membeli data pribadi dari pihak ketiga.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Tujuan penggunaan data</h2>
            <p>
              Data digunakan untuk: (1) membuat, memproses, dan melacak pesanan; (2) mengirim kode
              pesanan, rincian harga, dan kabar progres lewat WhatsApp; (3) mengelola akun dan portal
              klien; (4) memverifikasi pembayaran; (5) menyimpan dan menampilkan file cetak kamu;
              (6) menjawab pertanyaan dan memberikan dukungan; serta (7) menjaga keamanan dan mencegah
              penyalahgunaan layanan.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Dasar hukum</h2>
            <p>
              Kami memproses data karena diperlukan untuk melaksanakan kontrak pesanan dengan kamu,
              untuk mematuhi kewajiban hukum, dan dengan persetujuan kamu khi kamu secara sukarela
              mengirim data melalui formulir atau akun.
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
              Jika layanan pembayaran pihak ketiga diaktifkan, data terkait pembayaran diproses oleh
              penyedia tersebut sesuai kebijakan privasi mereka.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Pihak ketiga &amp; Google Drive</h2>
            <p>
              Kami memakai Neon Postgres sebagai database aplikasi dan WhatsApp gateway untuk notifikasi.
              Jika fitur penyimpanan Google Drive diaktifkan, file kamu disimpan di Google Drive milik
              operator dengan izin akun Google yang kita autorisasi. Akses file tetap dikontrol oleh
              aplikasi dan tidak dipublikasikan. Kami tidak menjual data pribadi kamu.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Retensi &amp; keamanan</h2>
            <p>
              Data pesanan dan akun disimpan selama diperlukan untuk layanan dan kewajiban hukum. File
              cetak disimpan selama akun atau pesanan terkait masih aktif. Kami membatasi akses admin,
              menggunakan koneksi terenkripsi, dan tidak menyimpan kata sandi dalam bentuk teks biasa.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Hak kamu</h2>
            <p>
              Kamu bisa meminta akses, pembetulan, ekspor, atau penghapusan data pribadi kamu, serta
              mencabut izin Google Drive kapan saja. Untuk mengajukan permintaan, hubungi kami lewat
              WhatsApp atau email di halaman kontak. Kami akan merespons dalam waktu wajar.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Anak-anak</h2>
            <p>
              Layanan ini tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak sengaja mengumpulkan
              data pribadi anak-anak. Jika kamu menemukan data tersebut, silakan hubungi kami agar
              segera dihapus.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Perubahan &amp; kontak</h2>
            <p>
              Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan akan diumumkan di halaman ini.
              Untuk pertanyaan tentang kebijakan ini, hubungi lucky77ag@gmail.com atau lewat WhatsApp yang
              tercantum di situs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
