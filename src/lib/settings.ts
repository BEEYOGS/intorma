import { sql } from "@/lib/db";

export type PaymentSettings = { enabled: boolean; bankName: string; bankAccount: string; bankHolder: string; note: string };

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const rows = await sql`select key, value from app_settings`;
  const map = new Map(rows.map((r) => [String(r.key), String(r.value)]));
  return {
    enabled: map.get("payment_enabled") === "1",
    bankName: map.get("bank_name") ?? "BCA",
    bankAccount: map.get("bank_account") ?? "",
    bankHolder: map.get("bank_holder") ?? "",
    note: map.get("payment_note") ?? "",
  };
}

export function paymentLines(p: PaymentSettings): string[] {
  return p.bankAccount ? [`${p.bankName} · ${p.bankAccount}${p.bankHolder ? ` · ${p.bankHolder}` : ""}${p.note ? `\n${p.note}` : ""}`] : [];
}
