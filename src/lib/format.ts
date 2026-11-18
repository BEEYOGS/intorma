export const rupiah = (n: number | null | undefined) =>
  n == null ? "-" : "Rp" + new Intl.NumberFormat("id-ID").format(n);

export const tanggal = (d: string | Date) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const jam = (d: string | Date) =>
  new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** 0812..., 812..., +62812... -> 62812... (kosong kalau tidak valid) */
export function normalizeWA(input: string): string {
  let n = input.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return /^62\d{8,13}$/.test(n) ? n : "";
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "INT-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
