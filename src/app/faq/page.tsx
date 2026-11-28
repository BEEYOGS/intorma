import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Chrome";
import { FaqBrowser } from "@/components/FaqBrowser";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Pertanyaan yang sering diajukan",
  description:
    "Jawaban seputar pemesanan desain dan cetak di in.torma: harga, file, pembayaran, deadline, revisi, dan pelacakan.",
};

const FAQS = [
  {
    q: "Bagaimana cara memesan?",
    a: "Pilih layanan di halaman pemesanan, isi jumlah atau ukuran, lalu lengkapi data dan deadline. Harga dihitung otomatis sebelum kamu mengirim pesanan.",
  },
  {
    q: "Apakah harga sudah final sebelum pesan?",
    a: "Ya. Untuk layanan dengan harga otomatis, total langsung muncul. Untuk layanan custom, admin akan mengirim harga lewat WhatsApp sebelum produksi.",
  },
  {
    q: "Format file apa yang diterima?",
    a: "PDF, JPG, PNG, AI, PSD, CDR, TIFF, atau ZIP. File besar bisa diunggah langsung ke Google Drive dari halaman pemesanan.",
  },
  {
    q: "Bagaimana pembayarannya?",
    a: "Transfer bank atau pembayaran online (jika aktif). Instruksi dan total muncul setelah pesanan dibuat, dan juga dikirim lewat WhatsApp.",
  },
  {
    q: "Kapan pesanan selesai?",
    a: "Setiap layanan punya estimasi hari pengerjaan. Deadline yang kamu isi akan masuk ke nota dan halaman lacak, dan admin mengabari progres lewat WhatsApp.",
  },
  {
    q: "Bisa revisi desain?",
    a: "Ya. Revisi kecil biasanya termasuk dalam paket. Tulis detail revisi di catatan pesanan atau chat WhatsApp dengan kode pesanan.",
  },
  {
    q: "Bagaimana cara melacak pesanan?",
    a: "Gunakan kode pesanan INT-DDMMYY001 di halaman lacak atau kirim “status INT-DDMMYY001” ke WhatsApp kami untuk balasan otomatis.",
  },
  {
    q: "Apakah bisa ambil sendiri di toko?",
    a: "Bisa. Pilih opsi pengambilan di toko saat memesan, atau tulis di catatan pesanan. Ongkir tidak dikenakan untuk pengambilan sendiri.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="animate-in">
      <TopBar />
      <div>
        <section className="pb-10 pt-20 sm:pb-12 sm:pt-28">
          <div className="wrap max-w-3xl">
            <p className="eyebrow mb-4">Pertanyaan yang sering diajukan</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Semua yang perlu kamu tahu sebelum memesan.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)] sm:text-base">
              Jawaban singkat seputar harga, file, pembayaran, deadline, revisi, dan pelacakan. Kalau belum ketemu, chat kami lewat WhatsApp.
            </p>
          </div>
        </section>

        <section className="pb-16">
          <div className="wrap max-w-3xl">
            <FaqBrowser faqs={FAQS} />
          </div>
        </section>

        <section className="pb-20">
          <div className="wrap max-w-3xl">
            <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Masih ada pertanyaan?</p>
                <p className="mt-1 text-xs text-[var(--text-3)]">Kami balas lewat WhatsApp, biasanya dalam beberapa menit.</p>
              </div>
              <Link href="/order" className="btn btn-primary w-fit !h-10 px-4 text-sm">
                Mulai pesan <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
