import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Nav } from "@/components/Chrome";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="konten" className="wrap py-20 sm:py-28">
        <p className="eyebrow">404</p>
        <h1 className="display mt-5 max-w-2xl text-[clamp(2.6rem,6vw,4.5rem)]">
          Halaman ini{" "}
          <span className="font-serif font-normal italic tracking-[-0.02em]">tidak ada.</span>
        </h1>
        <p className="mt-5 max-w-md text-sm leading-6 text-ink/65">
          Mungkin tautannya salah, atau kode pesanan yang kamu cari sudah tidak tersedia. Coba mulai
          dari beranda atau lacak pesanan dengan kode yang kamu terima.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Kembali ke beranda <span aria-hidden="true">→</span>
          </Link>
          <Link href="/lacak" className="btn-outline">
            Lacak pesanan
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
