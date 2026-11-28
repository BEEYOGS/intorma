"use client";

import type { ReactNode } from "react";

/**
 * Bungkus konten dengan animasi fade+naik tanpa mengganti key.
 * Subtree tidak di-remount saat navigasi, sehingga efek klien tidak dijalankan ulang.
 */
export function PageFade({ children }: { children: ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
