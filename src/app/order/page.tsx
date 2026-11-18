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
        <p className="mt-4 max-w-md text-soft">Isi formulir ini untuk mendapat kode pelacakan. Notifikasi WhatsApp mungkin tidak tersedia.</p>
        <div className="mt-12">
          {services.length > 0 ? (
            <OrderForm services={services} preselect={layanan} />
          ) : (
            <p role="status" className="border-y border-line py-6 text-soft">
              Layanan belum tersedia untuk dipesan.{" "}
              <a className="font-semibold text-white underline underline-offset-4" href="https://wa.me/6289617607952" target="_blank" rel="noreferrer">
                Hubungi kami lewat WhatsApp
              </a>
              .
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
