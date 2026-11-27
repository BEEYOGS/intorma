import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isAdmin } from "./auth";
import { getCustomer } from "./customer-auth";

/**
 * Kode pesanan sengaja mudah dibaca/disebutkan, jadi kode saja bukan bukti
 * kepemilikan. Setiap order punya token acak yang hanya dikirim lewat kanal
 * milik pelanggan (WhatsApp/tautan nota). Admin dan klien yang masuk lewat
 * portal tetap bisa membuka pesanannya tanpa token di URL.
 */
export type AccessOrder = {
  id?: number;
  code?: string;
  access_token?: string | null;
  customer_id?: number | string | null;
};

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

export function newOrderAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function cleanAccessToken(value: unknown): string | null {
  const token = typeof value === "string" ? value.trim() : "";
  return TOKEN_RE.test(token) ? token : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function validOrderAccessToken(order: AccessOrder, value: unknown): boolean {
  const token = cleanAccessToken(value);
  const expected = order.access_token;
  if (!token || !expected) return false;
  const a = digest(expected);
  const b = digest(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token lebih dipercaya daripada sesi karena tidak bergantung pada cookie. */
export async function hasOrderAccess(order: AccessOrder, value: unknown): Promise<boolean> {
  if (validOrderAccessToken(order, value)) return true;
  if (await isAdmin().catch(() => false)) return true;
  const customer = await getCustomer().catch(() => null);
  if (!customer) return false;
  return order.customer_id != null && Number(order.customer_id) === customer.id;
}

/** Menyisipkan token ke tautan internal tanpa mengubah query yang sudah ada. */
export function withAccess(path: string, value: unknown): string {
  const token = cleanAccessToken(value);
  if (!token) return path;
  const url = new URL(path, "http://local");
  url.searchParams.set("t", token);
  return `${url.pathname}${url.search}`;
}

export function accessQuery(value: unknown): string {
  const token = cleanAccessToken(value);
  return token ? `?t=${encodeURIComponent(token)}` : "";
}
