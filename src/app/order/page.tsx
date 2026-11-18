import { Footer, Nav } from "@/components/Chrome";
import { OrderForm } from "@/components/OrderForm";
import { getServices } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesan desain" };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ layanan?: string }> }) {
  const [services, { layanan }] = await Promise.all([getServices(), searchParams]);
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="text-5xl font-bold leading-none tracking-tightest sm:text-6xl">Pesan desain</h1>
        <p className="mt-4 max-w-md text-soft">Isi formulir ini. Setelah terkirim, kamu dapat kode pesanan dan notifikasi di WhatsApp.</p>
        <div className="mt-12">
          <OrderForm services={services} preselect={layanan} />
        </div>
      </main>
      <Footer />
    </>
  );
}
