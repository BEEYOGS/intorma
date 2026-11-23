import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";

const COOKIE = "int_customer";
const secret = () => process.env.CUSTOMER_SECRET || process.env.ADMIN_SECRET || "";

export type Customer = {
  id: number;
  name: string;
  wa: string;
  email: string;
};

function sign(id: number): string {
  return createHmac("sha256", secret()).update(`customer-${id}`).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function setCustomerSession(id: number) {
  (await cookies()).set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(COOKIE);
}

export async function getCustomer(): Promise<Customer | null> {
  if (!secret()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [rawId, signature] = value.split(".");
  const id = Number(rawId);
  if (!id || !signature) return null;
  const expected = Buffer.from(sign(id));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const rows = (await sql`
    select id, name, wa, email from customers where id = ${id}
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

/** Pesanan lama dengan nomor WhatsApp yang sama ikut terhubung ke akun baru. */
export async function claimOrders(customerId: number, wa: string) {
  await sql`update orders set customer_id = ${customerId} where customer_id is null and wa = ${wa}`;
}
