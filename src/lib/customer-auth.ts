import { createHash, createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { sql } from "./db";

const scryptAsync = promisify(scrypt);
const COOKIE = "int_customer";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const secret = () => process.env.CUSTOMER_SECRET || process.env.ADMIN_SECRET || "";
const HASH_FORMAT = /^[0-9a-f]{32}:[0-9a-f]{128}$/i;

export type Customer = {
  id: number;
  name: string;
  wa: string;
  email: string;
};

function sign(id: number, expiresAt: number): string {
  return createHmac("sha256", secret())
    .update(`customer-${id}-${expiresAt}`)
    .digest("hex");
}

function sha(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Hash rusak/import manual tidak boleh lolos dengan password sembarangan. */
export function verifyPassword(password: string, stored: string): boolean {
  const value = String(stored);
  if (!HASH_FORMAT.test(value)) return false;
  const [salt, hash] = value.split(":");
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== 64) return false;
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

/** Versi async supaya verifikasi banyak akun tidak memblokir event loop. */
export async function verifyPasswordAsync(password: string, stored: string): Promise<boolean> {
  const value = String(stored);
  if (!HASH_FORMAT.test(value)) return false;
  const [salt, hash] = value.split(":");
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== 64) return false;
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(expected, actual);
}

export async function setCustomerSession(id: number) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  (await cookies()).set(COOKIE, `${id}.${expiresAt}.${sign(id, expiresAt)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** Token customer tanpa expiry tidak lagi diterima (harus 3 bagian). */
function validSignature(parts: string[]): { id: number } | null {
  if (parts.length !== 3) return null;
  const id = Number(parts[0]);
  const expiresAt = Number(parts[1]);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  const expected = Buffer.from(sign(id, expiresAt));
  const actual = Buffer.from(parts[2]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id };
}

export async function getCustomer(): Promise<Customer | null> {
  if (!secret()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const parts = value.split(".");
  const session = validSignature(parts);
  if (!session) return null;

  const rows = (await sql`
    select id, name, wa, email from customers where id = ${session.id}
  `) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    wa: String(row.wa),
    email: String(row.email),
  };
}

/**
 * Pesanan lama dengan nomor WhatsApp yang sama hanya dihubungkan bila pengguna
 * secara eksplisit meminta klaim saat registrasi/masuk (tombol "Hubungkan
 * pesanan lama"). Profil tidak pernah memindahkan pesanan nomor lain.
 */
export async function claimOrders(customerId: number, wa: string) {
  await sql`update orders set customer_id = ${customerId} where customer_id is null and wa = ${wa}`;
}

export function sha256(value: string): string {
  return sha(value).toString("hex");
}
