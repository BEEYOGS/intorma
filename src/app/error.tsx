"use client";

import Link from "next/link";
import { WhatsAppLink } from "@/components/WhatsApp";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="konten" className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow">Ada gangguan</p>
        <h1 className="display mt-5 text-4xl sm:text-5xl">Halaman gagal dimuat.</h1>
        <p className="mt-4 text-sm leading-6 text-ink/65">
          Coba muat ulang sebentar lagi. Kalau masih gagal, hubungi kami lewat WhatsApp supaya pesanan
          tetap bisa diproses.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Coba lagi
          </button>
          <Link href="/" className="btn-outline">
            Kembali ke beranda
          </Link>
          <WhatsAppLink
            text="Halo in.torma, saya sedang mengalami kendala di situs."
            className="btn-outline"
          >
            Chat WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </main>
  );
}
