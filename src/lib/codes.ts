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

  // Satu baris per hari WIB. UPSERT atomik menggantikan "baca terakhir + 1"
  // yang bisa duplikat kalau dua order masuk bersamaan.
  const rows = (await sql.query(
    `insert into order_code_counters (day, last_seq) values ($1, 1)
     on conflict (day) do update set last_seq = order_code_counters.last_seq + 1
     returning last_seq`,
    [prefix.slice(4)],
  )) as Array<{ last_seq: number }>;
  const seq = Number(rows[0]?.last_seq ?? 1);
  return `${prefix}${String(seq).padStart(3, "0")}`;
}
