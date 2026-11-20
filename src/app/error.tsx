"use client";

import { useState } from "react";
import Link from "next/link";

export default function ErrorPage({ error }: { error: Error }) {
  const [message] = useState(error.message || "Terjadi kesalahan.");
  return (
    <div className="animate-in">
      <div className="wrap py-16 sm:py-24">
        <p className="eyebrow mb-2">Error</p>
        <h1 className="display text-2xl sm:text-3xl mb-4">Ada yang salah.</h1>
        <div className="card p-5 mb-6 max-w-lg">
          <p className="mono text-sm text-[var(--text-2)]">{message}</p>
        </div>
        <Link href="/" className="btn btn-primary">Kembali ke beranda</Link>
      </div>
    </div>
  );
}