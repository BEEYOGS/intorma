"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

const DRAFT_KEY = "intorma-order-draft";

export function ReorderButton({
  serviceId,
  qty,
  widthCm,
  heightCm,
}: {
  serviceId: string | null;
  qty: number | string | null;
  widthCm: number | string | null;
  heightCm: number | string | null;
}) {
  const router = useRouter();

  function reorder() {
    if (!serviceId) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          serviceId,
          qty: qty == null ? "" : String(qty),
          width: widthCm == null ? "" : String(widthCm),
          height: heightCm == null ? "" : String(heightCm),
          selection: {},
          at: Date.now(),
        }),
      );
    } catch {
      // Abaikan kegagalan penyimpanan.
    }
    router.push("/order");
  }

  if (!serviceId) return null;

  return (
    <button
      type="button"
      onClick={reorder}
      className="btn btn-ghost min-h-12 !px-3 text-xs"
      aria-label="Pesan ulang dengan spesifikasi yang sama"
    >
      <RotateCcw aria-hidden className="size-3.5" /> Pesan ulang
    </button>
  );
}
