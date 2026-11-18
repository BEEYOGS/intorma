import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { OrderForm } from "@/components/OrderForm";
import { getServices } from "@/lib/db";
import { getPaymentSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesan desain" };

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ layanan?: string }>;
}) {
  const [services, payment, { layanan }] = await Promise.all([
    getServices(),
    getPaymentSettings(),
    searchParams,
  ]);

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line">
          <div className="wrap pb-10 pt-9 sm:pb-14 sm:pt-12">
            <Link href="/" className="text-[13px] font-medium text-mute transition-colors hover:text-ink">
              ← Kembali ke beranda
            </Link>
            <h1 className="display mt-6 text-[clamp(2.5rem,6vw,4.5rem)]">Ceritakan kebutuhanmu.</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-ink/65 sm:text-base sm:leading-7">
              Satu formulir, sekitar dua menit. Setelah terkirim kamu mendapat kode pesanan dan salinannya
              lewat WhatsApp.
            </p>
          </div>
        </div>

        <div className="wrap py-12 sm:py-16">
          {services.length === 0 ? (
            <div className="max-w-lg rounded-tag-lg border border-line bg-panel/60 p-6">
              <p className="font-semibold">Belum ada layanan aktif.</p>
              <p className="mt-2 text-sm leading-6 text-mute">
                Tambahkan layanan dulu dari halaman admin, atau hubungi kami lewat WhatsApp.
              </p>
            </div>
          ) : (
            <OrderForm services={services} preselect={layanan} payment={payment} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
