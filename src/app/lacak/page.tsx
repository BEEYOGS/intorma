import { Footer, Nav } from "@/components/Chrome";
import { LacakForm } from "@/components/LacakForm";
import { WhatsAppLink } from "@/components/WhatsApp";

export const metadata = { title: "Lacak pesanan" };

export default function LacakPage() {
  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line bg-sand/40">
          <div className="wrap py-9 sm:py-12">
            <p className="eyebrow">Lacak pesanan</p>
            <h1 className="display mt-3 text-[clamp(1.9rem,4vw,2.8rem)]">Pesanan kamu di mana?</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
              Masukkan kode pesanan yang dikirim lewat WhatsApp untuk melihat status, riwayat, harga,
              dan instruksi pembayaran.
            </p>
          </div>
        </div>

        <div className="wrap grid gap-10 py-10 sm:py-14 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-16">
          <div>
            <div className="space-y-3">
              {[
                ["Kode ada di pesan WhatsApp", "Dikirim otomatis setelah kamu mengisi formulir pesanan."],
                ["Formatnya INT-XXXXXX", "Huruf besar/kecil sama saja. Tanda hubung opsional."],
                ["Bisa juga lewat chat", 'Kirim "status INT-XXXXXX" ke WhatsApp kami untuk balasan otomatis.'],
              ].map(([title, body]) => (
                <div key={title} className="card p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-mute">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-mute">
              Kode hilang?{" "}
              <WhatsAppLink
                text="Halo in.torma, saya kehilangan kode pesanan. Nama saya:"
                className="font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              >
                Chat kami
              </WhatsAppLink>{" "}
              dengan nama dan nomor WhatsApp yang dipakai saat memesan.
            </p>
          </div>

          <LacakForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
