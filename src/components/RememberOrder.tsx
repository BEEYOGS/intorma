"use client";

import { useEffect } from "react";

export const RECENT_KEY = "intorma-recent-orders";

export type RecentOrder = {
  code: string;
  label: string;
  at: number;
};

export function readRecentOrders(): RecentOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentOrder =>
        !!item &&
        typeof item === "object" &&
        typeof (item as RecentOrder).code === "string" &&
        typeof (item as RecentOrder).at === "number",
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function rememberOrder(code: string, label: string) {
  if (typeof window === "undefined" || !code) return;
  try {
    const next: RecentOrder[] = [
      { code, label: label || "Pesanan", at: Date.now() },
      ...readRecentOrders().filter((item) => item.code.toUpperCase() !== code.toUpperCase()),
    ].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("intorma:recent-orders"));
  } catch {
    // Penyimpanan bisa ditolak (private mode); alur lacak tetap berjalan.
  }
}

/** Dipasang di halaman detail agar kode yang dibuka tersimpan untuk akses cepat. */
export function RememberOrder({ code, label }: { code: string; label: string }) {
  useEffect(() => {
    rememberOrder(code, label);
  }, [code, label]);
  return null;
}
