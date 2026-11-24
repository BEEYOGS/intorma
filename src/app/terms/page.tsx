import { TopBar } from "@/components/TopBar";

export const metadata = { title: "Syarat & Ketentuan" };

export default function TermsPage() {
  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-10 sm:py-14">
        <p className="eyebrow mb-2">Legal</p>
        <h1 className="display text-2xl sm:text-3xl">Syarat &amp; Ketentuan</h1>
        <p className="mt-2 text-sm text-mute">Terakhir diperbarui: 23 November 2026</p>

        <div className="mt-8 max-w-3xl space-y-6 text-sm leading-7 text-[var(--text-2)]">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Pemesanan</h2>
            <p>
              Harga tampil otomatis berdasarkan layanan, bahan, ukuran, finishing, dan jumlah yang kamu
              pilih. Pesanan dianggap dibuat setelah kamu menekan tombol “Buat pesanan”. Kode pesanan
              dikirim lewat WhatsApp dan bisa dipakai untuk melacak progres.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Pembayaran</h2>
            <p>
              Pembayaran dilakukan sesuai total yang tertera. Untuk transfer manual, pesanan diproses
              setelah pembayaran diverifikasi admin. Jika tersedia pembayaran otomatis, status lunas
              diperbarui setelah konfirmasi dari penyedia pembayaran.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">File pelanggan</h2>
            <p>
              Kamu bertanggung jawab atas file yang diunggah, termasuk hak cipta dan kesesuaiannya untuk
              cetak. Kami tidak memeriksa setiap file secara hukum dan bisa menolak pesanan yang melanggar
              hukum atau kebijakan kami.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Revisi &amp; pembatalan</h2>
            <p>
              Lingkup revisi mengikuti paket yang dipilih. Pembatalan bisa diajukan lewat WhatsApp sebelum
              produksi dimulai. Pendinganaan yang sudah masuk dapat dikembalikan sesuai kesepakatan.
            </p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-medium text-[var(--text)]">Kontak</h2>
            <p>
              Untuk pertanyaan tentang syarat ini, hubungi in.torma lewat tautan WhatsApp yang tersedia di
              halaman kontak.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
