import { createHmac, timingSafeEqual } from "node:crypto";

// Token ringan untuk endpoint upload langsung. Tujuannya bukan menggantikan
// autentikasi, tapi mencegah endpoint publik dipakai orang luar untuk
// mengisi folder Drive tanpa pernah membuka halaman pesanan.
const TTL_MS = 6 * 60 * 60 * 1000;

const secret = () => process.env.UPLOAD_TOKEN_SECRET || process.env.ADMIN_SECRET || "";

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUploadToken(): string {
  if (!secret()) return "";
  const expires = Date.now() + TTL_MS;
  const payload = `drive-upload:${expires}`;
  return `${expires}.${signature(payload)}`;
}

export function verifyUploadToken(token: string | null | undefined): boolean {
  if (!secret()) return true; // development tanpa ADMIN_SECRET
  if (!token) return false;
  const [expiresRaw, given] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  if (!given) return false;
  const expected = signature(`drive-upload:${expires}`);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
