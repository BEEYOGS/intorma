/* eslint-disable @next/next/no-img-element */
import type { PaymentSettings } from "@/lib/settings";

function isBca(bank: string) {
  const key = bank.toLowerCase().replace(/[^a-z]/g, "");
  return key === "bca" || key === "bankcentralasia";
}

export function hasBankLogo(bank: string) {
  return isBca(bank);
}

/** Logo bank asli (BCA dari Wikimedia Commons). Kosong untuk bank lain. */
export function BankLogo({
  bank,
  className = "h-6 w-auto",
}: {
  bank: string | PaymentSettings["bankName"];
  className?: string;
}) {
  if (!isBca(bank)) return null;
  return <img src="/bca.svg" alt="Logo Bank Central Asia (BCA)" className={className} />;
}
