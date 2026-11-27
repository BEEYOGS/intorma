import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { TopBar } from "@/components/TopBar";
import { isAdmin } from "@/lib/auth";
import { getServices } from "@/lib/db";

export default async function KatalogPage() {
  const [services, admin] = await Promise.all([getServices(), isAdmin()]);

  return (
    <div className="animate-in">
      <TopBar isAdmin={admin} />

      <section className="pb-10 pt-20 sm:pb-12 sm:pt-28">
        <div className="wrap">
          <p className="eyebrow mb-4">Katalog layanan</p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Semua yang bisa kami buat untukmu.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-2)] sm:text-base">
                Cari layanan, bandingkan harga awal, lalu tentukan spesifikasi. Harga cetak dihitung
                otomatis saat kamu mengisi jumlah dan ukuran.
              </p>
              <p className="mt-2 text-xs text-[var(--text-3)]">
                Gambar di katalog adalah ilustrasi skematis, bukan foto hasil produksi.
              </p>
            </div>
            <Link href="/order" className="btn btn-primary w-fit !h-10 px-4 text-sm">
              Mulai pesan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="wrap">
          <CatalogBrowser services={services} />
        </div>
      </section>

      <section className="pb-20">
        <div className="wrap">
          <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Belum menemukan yang dicari?</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">
                Pilih “Belum tahu butuh apa” di halaman pemesanan, lalu ceritakan kebutuhanmu.
              </p>
            </div>
            <Link href="/order?layanan=lain" className="btn btn-ghost w-fit !h-10 px-4 text-sm">
              Ceritakan kebutuhan <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
