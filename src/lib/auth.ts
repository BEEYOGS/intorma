import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { verifyPassword } from "./customer-auth";

const COOKIE = "int_admin";
const sign = () => createHmac("sha256", process.env.ADMIN_SECRET ?? "").update("admin").digest("hex");
const sha = (s: string) => createHash("sha256").update(s).digest();

function safeShaEqual(a: string, b: string): boolean {
  const left = sha(a);
  const right = sha(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type AdminAccount = {
  id: number;
  username: string;
  label: string;
  created_at: string;
  last_login_at: string | null;
};

export type AdminCredential = {
  id: number | null;
  username: string;
  source: "env" | "db";
};

export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const rows = (await sql`
    select id, username, label, created_at, last_login_at from admin_accounts order by id
  `) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    label: String(row.label ?? ""),
    created_at: String(row.created_at),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
  }));
}

/**
 * Password ADMIN_PASSWORD di environment tetap diterima sebagai cadangan.
 * Akun di database dicek setelahnya, sehingga kelola akun tidak bisa mengunci
 * admin keluar dari panel.
 */
export async function verifyAdminCredential(password: string): Promise<AdminCredential | null> {
  if (!password) return null;
  const master = process.env.ADMIN_PASSWORD;
  if (master && safeShaEqual(password, master)) {
    return { id: null, username: "admin (env)", source: "env" };
  }

  const rows = (await sql`select id, username, password_hash from admin_accounts`) as Array<
    Record<string, unknown>
  >;
  for (const row of rows) {
    if (verifyPassword(password, String(row.password_hash))) {
      return { id: Number(row.id), username: String(row.username), source: "db" };
    }
  }
  return null;
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_SECRET) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sign());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login(password: string): Promise<boolean> {
  if (!process.env.ADMIN_SECRET) return false;
  const credential = await verifyAdminCredential(password).catch(() => null);
  if (!credential) return false;
  if (credential.source === "db" && credential.id) {
    await sql`update admin_accounts set last_login_at = now() where id = ${credential.id}`.catch(
      () => undefined,
    );
  }
  (await cookies()).set(COOKIE, sign(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}
