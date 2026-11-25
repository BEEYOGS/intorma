"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Bungkus konten halaman dengan animasi fade+naik saat pathname berubah.
 * Keyed per route supaya animasi jalan tiap navigasi.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
