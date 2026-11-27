import { createHmac, timingSafeEqual } from "node:crypto";

// Token ringan untuk endpoint upload langsung. Tujuannya bukan menggantikan
// autentikasi, tapi mencegah endpoint publik dipakai orang luar untuk
// mengisi folder Drive tanpa pernah membuka halaman pesanan.
const TTL_MS = 6 * 60 * 60 * 1000;

const secret = () => process.env.UPLOAD_TOKEN_SECRET || process.env.ADMIN_SECRET || "";

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function payloadFor(expires: number, customerId: number | null): string {
  return `drive-upload:${expires}:${customerId ?? 0}`;
}

export function createUploadToken(customerId?: number | null): string {
  if (!secret()) return "";
  const expires = Date.now() + TTL_MS;
  return `${expires}.${signature(payloadFor(expires, customerId ?? null))}`;
}

/**
 * Token terikat akun yang membuka halaman. Token yang dibuat untuk pelanggan
 * A tidak bisa dipakai sesi B untuk mendaftarkan file ke akun B.
 */
export function verifyUploadToken(
  token: string | null | undefined,
  customerId?: number | null,
): boolean {
  if (!secret()) return false;
  if (!token) return false;
  const [expiresRaw, given] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  if (!given) return false;
  const expected = signature(payloadFor(expires, customerId ?? null));
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
