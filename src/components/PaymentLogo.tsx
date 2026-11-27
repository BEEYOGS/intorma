/* eslint-disable @next/next/no-img-element */
import { Landmark, QrCode } from "lucide-react";
import { findBankLogo } from "@/components/BankLogo";
import type { PaymentMethodMeta } from "@/lib/payment";

/** Logo metode pembayaran asli; fallback ke ikon generik bila aset belum tersedia. */
export function PaymentLogo({
  method,
  className = "size-full object-contain",
}: {
  method: PaymentMethodMeta;
  className?: string;
}) {
  if (method.id === "qris") {
    return <img src="/logos/qris.svg" alt="Logo QRIS" className={className} />;
  }

  const bank = method.bank ? findBankLogo(method.bank) : null;
  if (bank) {
    return <img src={bank.src} alt={bank.alt} className={className} />;
  }

  const Icon = method.kind === "qris" ? QrCode : Landmark;
  return <Icon aria-hidden className={className} />;
}
