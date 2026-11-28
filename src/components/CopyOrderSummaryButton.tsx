"use client";

import { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { rupiah, tanggalJam } from "@/lib/format";
import { toast } from "@/components/Toast";

export function CopyOrderSummaryButton({
  code,
  service,
  status,
  deadline,
  price,
  paid,
}: {
  code: string;
  service?: string | null;
  status?: string | null;
  deadline?: string | Date | null;
  price?: number | null;
  paid?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (busy) return;
    setBusy(true);
    const deadlineDate = deadline ? new Date(deadline) : null;
    const lines = [
      "Ringkasan pesanan in.torma",
      `Kode: ${code}`,
      service ? `Layanan: ${service}` : null,
      status ? `Status: ${status}` : null,
      price != null ? `Total: ${rupiah(price)}${paid ? " (lunas)" : " (belum dibayar)"}` : null,
      deadlineDate && !Number.isNaN(deadlineDate.getTime())
        ? `Target selesai: ${tanggalJam(deadlineDate)}`
        : null,
      `Lacak: https://intorma-psi.vercel.app/lacak/${code}`,
    ].filter(Boolean) as string[];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast("Ringkasan pesanan disalin.", "ok");
    } catch {
      toast("Ringkasan tidak bisa disalin. Salin manual dari halaman ini.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={busy}
      aria-label="Salin ringkasan pesanan"
      className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
    >
      <ClipboardCopy aria-hidden className="size-4" /> Salin ringkasan
    </button>
  );
}
