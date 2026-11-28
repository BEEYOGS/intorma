"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminTabs } from "@/lib/admin-tabs";

/** 1–5 membuka lima tujuan admin pertama. Tidak aktif saat mengetik atau ada dialog. */
export function AdminShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!/^[1-5]$/.test(event.key)) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (typing || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const tab = adminTabs[Number(event.key) - 1];
      if (!tab) return;
      event.preventDefault();
      router.push(tab.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
