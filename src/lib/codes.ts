import { sql } from "./db";

/**
 * Kode pesanan baru: INT-DDMMYY001 (tanggal WIB + nomor urut per hari).
 * Kode lama berformat INT-XXXXXX tetap dikenali supaya riwayat tidak rusak.
 */
export const CODE_PATTERN = /^INT-(\d{9,}|[A-Z0-9]{6})$/;

export function normalizeCode(input: string): string {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  const body = raw.replace(/^INT-?/, "");
  return `INT-${body.replace(/-/g, "")}`;
}

export function isValidCode(input: string): boolean {
  return CODE_PATTERN.test(normalizeCode(input));
}

export async function makeCode(): Promise<string> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const prefix = `INT-${part("day")}${part("month")}${part("year")}`;

  const rows = (await sql.query(
    "select code from orders where code like $1 order by code desc limit 1",
    [`${prefix}%`],
  )) as Array<{ code: string }>;
  const last = Number(String(rows[0]?.code ?? "").slice(prefix.length)) || 0;
  return `${prefix}${String(last + 1).padStart(3, "0")}`;
}
