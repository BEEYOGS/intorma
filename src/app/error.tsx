"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="animate-in">
      <div className="wrap py-16 sm:py-24">
        <p className="eyebrow mb-2">Error</p>
        <h1 className="display text-2xl sm:text-3xl mb-4">Ada yang salah.</h1>
        <div className="card p-5 mb-6 max-w-lg">
          <p className="mono text-sm text-[var(--text-2)]">
            {error.digest ? `Kode: ${error.digest}` : "Terjadi kesalahan saat memuat halaman."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Coba lagi
          </button>
          <Link href="/" className="btn btn-ghost">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
