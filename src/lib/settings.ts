import { sql } from "./db";

export type PaymentSettings = {
  enabled: boolean;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  note: string;
};

export const PAYMENT_DEFAULTS: PaymentSettings = {
  enabled: true,
  bankName: "BCA",
  bankAccount: "8171700213",
  bankHolder: "Yogi",
  note: "Transfer sesuai total, lalu konfirmasi lewat WhatsApp.",
};

export const PAYMENT_KEYS = {
  enabled: "payment_enabled",
  bankName: "bank_name",
  bankAccount: "bank_account",
  bankHolder: "bank_holder",
  note: "payment_note",
} as const;

export async function getPaymentSettings(): Promise<PaymentSettings> {
  let values: Record<string, string> = {};
  try {
    const rows = (await sql`select key, value from app_settings`) as Array<{ key: string; value: string }>;
    values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return PAYMENT_DEFAULTS;
  }
  const pick = (key: string, fallback: string) =>
    values[key] === undefined ? fallback : values[key];
  return {
    enabled: values[PAYMENT_KEYS.enabled] !== "0",
    bankName: pick(PAYMENT_KEYS.bankName, PAYMENT_DEFAULTS.bankName),
    bankAccount: pick(PAYMENT_KEYS.bankAccount, PAYMENT_DEFAULTS.bankAccount),
    bankHolder: pick(PAYMENT_KEYS.bankHolder, PAYMENT_DEFAULTS.bankHolder),
    note: pick(PAYMENT_KEYS.note, PAYMENT_DEFAULTS.note),
  };
}

export async function savePaymentSettings(s: PaymentSettings): Promise<void> {
  const entries: Array<[string, string]> = [
    [PAYMENT_KEYS.enabled, s.enabled ? "1" : "0"],
    [PAYMENT_KEYS.bankName, s.bankName],
    [PAYMENT_KEYS.bankAccount, s.bankAccount],
    [PAYMENT_KEYS.bankHolder, s.bankHolder],
    [PAYMENT_KEYS.note, s.note],
  ];
  for (const [key, value] of entries) {
    await sql`
      insert into app_settings (key, value, updated_at) values (${key}, ${value}, now())
      on conflict (key) do update set value = excluded.value, updated_at = now()`;
  }
}

/** Blok teks pembayaran untuk pesan WhatsApp / halaman lacak. */
export function paymentLines(s: PaymentSettings): string[] {
  if (!s.enabled) return [];
  const rek = [s.bankName, s.bankAccount].filter(Boolean).join(" ");
  if (!rek) return [];
  return [
    `Transfer ${rek}${s.bankHolder ? ` a.n. ${s.bankHolder}` : ""}`,
    ...(s.note ? [s.note] : []),
  ];
}
