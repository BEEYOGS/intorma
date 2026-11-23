import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { OrderForm } from "@/components/OrderForm";
import { getServicesWithOptions } from "@/lib/db";
import { getPaymentSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesan desain & cetak" };

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ layanan?: string }>;
}) {
  const [services, payment, { layanan }] = await Promise.all([
    getServicesWithOptions(),
    getPaymentSettings(),
    searchParams,
  ]);

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line bg-sand/40">
          <div className="wrap py-10 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Link href="/" className="block w-fit text-[13px] font-medium text-mute transition-colors hover:text-accent">
                  ← Kembali ke beranda
                </Link>
                <p className="eyebrow mt-7">Pesan layanan</p>
                <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.2rem)]">
                  Ceritakan{" "}
                  <span className="font-serif font-normal italic tracking-[-0.02em] text-accent">kebutuhanmu.</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-mute sm:text-base sm:leading-7">
                  Satu formulir, sekitar dua menit. Setelah terkirim kamu mendapat kode pesanan dan salinannya
                  lewat WhatsApp.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="chip"><span aria-hidden className="status-dot bg-accent" /> ± 2 menit</span>
                <span className="chip">Harga otomatis</span>
                <span className="chip">Kode pesanan</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wrap pb-28 pt-10 sm:pb-28 sm:pt-14 lg:pb-20">
          {services.length === 0 ? (
            <div className="card max-w-lg p-6">
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
