"use client";

import { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { rupiah, tanggalJam } from "@/lib/format";
import { toast } from "@/components/Toast";

export function CopyPaymentDetailsButton({
  code,
  method,
  amount,
  vaNumber,
  bank,
  expiresAt,
}: {
  code: string;
  method: string;
  amount: number | null;
  vaNumber?: string | null;
  bank?: string | null;
  expiresAt?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (busy) return;
    setBusy(true);
    const lines = [
      "Pembayaran in.torma",
      `Kode pesanan: ${code}`,
      `Metode: ${method}`,
      amount != null ? `Nominal: ${rupiah(amount)}` : null,
      bank ? `Bank: ${bank}` : null,
      vaNumber ? `Nomor VA: ${vaNumber}` : null,
      expiresAt ? `Berlaku sampai: ${tanggalJam(expiresAt)}` : null,
      `Lacak: https://intorma-psi.vercel.app/lacak/${code}`,
    ].filter(Boolean) as string[];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast("Detail pembayaran disalin.", "ok");
    } catch {
      toast("Detail pembayaran tidak bisa disalin. Salin manual dari halaman ini.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={busy}
      aria-label="Salin detail pembayaran"
      className="btn btn-ghost min-h-12 w-full px-4 text-sm sm:min-h-10"
    >
      <ClipboardCopy aria-hidden className="size-4" /> Salin detail pembayaran
    </button>
  );
}
