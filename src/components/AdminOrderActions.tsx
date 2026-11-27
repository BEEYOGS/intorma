"use client";

import { useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { toast } from "@/components/Toast";

export function CopySpecButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Spesifikasi produksi disalin.", "ok");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Gagal menyalin spesifikasi.", "error");
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-ghost min-h-10 px-4 text-sm">
      <ClipboardCheck aria-hidden className="size-4" /> {copied ? "Tersalin" : "Salin spesifikasi"}
    </button>
  );
}

export function SyncPaymentButton({ code }: { code: string }) {
  const [pending, setPending] = useState(false);

  async function sync() {
    setPending(true);
    try {
      const response = await fetch(`/api/payment/status?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { paid?: boolean; orderStatus?: string; error?: string };
      if (!response.ok) {
        toast(data.error || "Gagal mengecek status pembayaran.", "error");
        return;
      }
      toast(data.paid ? "Pembayaran terverifikasi." : "Belum ada pembayaran baru.", "ok");
      window.location.reload();
    } catch {
      toast("Gagal mengecek status pembayaran.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={sync} disabled={pending} className="btn btn-ghost min-h-10 px-4 text-sm">
      <RefreshCw aria-hidden className={`size-4 ${pending ? "animate-spin" : ""}`} /> Sync Midtrans
    </button>
  );
}
