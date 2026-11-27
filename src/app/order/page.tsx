import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";
import { OrderForm } from "@/components/OrderForm";
import { getCustomer } from "@/lib/customer-auth";
import { getServicesWithOptions } from "@/lib/db";
import { driveEnabled } from "@/lib/drive";
import { getPaymentSettings } from "@/lib/settings";
import { createUploadToken } from "@/lib/upload-token";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesan desain & cetak" };

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ layanan?: string }>;
}) {
  const [services, payment, { layanan }, customer] = await Promise.all([
    getServicesWithOptions(),
    getPaymentSettings(),
    searchParams,
    getCustomer(),
  ]);

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line bg-sand/40">
          <div className="wrap py-8 sm:py-12">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <Link href="/" className="block w-fit text-xs font-medium text-mute transition-colors hover:text-ink">
                  ← Kembali ke beranda
                </Link>
                <p className="eyebrow mt-4">Pesan layanan</p>
                <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.8rem)]">
                  Ceritakan kebutuhanmu.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
                  Pilih layanan, atur spesifikasi, lalu lihat total sebelum memesan.
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

        <div className="wrap pb-32 pt-8 sm:pb-32 sm:pt-12 lg:pb-24">
          {services.length === 0 ? (
            <div className="card max-w-lg p-6">
              <p className="font-semibold">Belum ada layanan aktif.</p>
              <p className="mt-2 text-sm leading-6 text-mute">
                Tambahkan layanan dulu dari halaman admin, atau hubungi kami lewat WhatsApp.
              </p>
            </div>
          ) : (
            <OrderForm
              services={services}
              preselect={layanan}
              payment={payment}
              customer={customer ? { name: customer.name, wa: customer.wa } : undefined}
              driveReady={driveEnabled()}
              uploadToken={createUploadToken(customer?.id ?? null)}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
