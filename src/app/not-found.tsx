import Link from "next/link";

export default function NotFound() {
  return (
    <div className="animate-in">
      <div className="wrap py-20 sm:py-32 text-center">
        <p className="mono text-6xl font-bold text-[var(--text-3)] mb-4">404</p>
        <h1 className="display text-2xl sm:text-3xl mb-3">Halaman tidak ditemukan.</h1>
        <p className="text-sm text-[var(--text-2)] mb-8 max-w-md mx-auto">
          URL yang kamu cari tidak ada. Kembali ke halaman utama atau mulai pesan.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Kembali ke beranda</Link>
          <Link href="/order" className="btn btn-ghost">Mulai pesan</Link>
        </div>
      </div>
    </div>
  );
}