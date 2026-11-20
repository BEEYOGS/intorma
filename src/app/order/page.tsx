import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { OrderForm } from "@/components/OrderForm";
import { CropCorners, RegMark } from "@/components/Press";
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
        <div className="relative overflow-hidden border-b border-line">
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-24 size-[26rem] rounded-full bg-cyan/[0.06] blur-[100px]" />
          <div className="wrap relative pb-10 pt-9 sm:pb-14 sm:pt-12">
            <Link href="/" className="font-mono text-[12px] uppercase tracking-[0.14em] text-mute transition-colors hover:text-cyan">
              ← Kembali ke beranda
            </Link>
            <h1 className="display enter mt-7 text-[clamp(2.5rem,6vw,4.5rem)]">
              Ceritakan
              <br />
              <span className="font-serif font-normal italic tracking-[-0.02em] text-cyan">kebutuhanmu.</span>
            </h1>
            <p className="enter mt-6 max-w-xl text-sm leading-6 text-ink/65 sm:text-base sm:leading-7" style={{ "--enter-delay": "120ms" } as React.CSSProperties}>
              Satu formulir, sekitar dua menit. Setelah terkirim kamu mendapat kode pesanan dan salinannya
              lewat WhatsApp.
            </p>
          </div>
        </div>

        <div className="wrap pb-28 pt-12 sm:pb-28 sm:pt-16 lg:pb-16">
          {services.length === 0 ? (
            <div className="relative max-w-lg border border-line bg-panel/70 p-7">
              <CropCorners />
              <RegMark className="size-4 text-yellow" />
              <p className="mt-4 font-semibold">Belum ada layanan aktif.</p>
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