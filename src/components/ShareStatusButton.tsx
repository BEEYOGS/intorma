"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "@/components/Toast";

export function ShareStatusButton({
  code,
  status,
  deadline,
}: {
  code?: string;
  status?: string;
  deadline?: string | null;
} = {}) {
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    const url = window.location.href;
    const text = code
      ? `Status pesanan ${code}${status ? `: ${status}` : ""}${deadline ? `\nTarget selesai: ${deadline}` : ""}\nLacak: ${url}`
      : url;
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lacak pesanan in.torma", text, url });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast("Ringkasan status disalin.", "ok");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Ringkasan tidak bisa disalin. Salin alamat halaman ini secara manual.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      aria-label="Bagikan ringkasan status pesanan"
      className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
    >
      <Share2 aria-hidden className="size-4" /> Bagikan ringkasan
    </button>
  );
}
