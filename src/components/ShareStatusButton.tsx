"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "@/components/Toast";

export function ShareStatusButton() {
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    const url = window.location.href;
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lacak pesanan in.torma", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Tautan lacak disalin.", "ok");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Tautan tidak bisa disalin. Salin alamat halaman ini secara manual.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      aria-label="Bagikan tautan lacak"
      className="btn btn-ghost min-h-10 px-3 text-xs"
    >
      <Share2 aria-hidden className="size-3.5" /> Bagikan
    </button>
  );
}
