import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "./db";
import { verifyPasswordAsync } from "./customer-auth";
import { audit } from "./audit";
import { clientKey, rateLimit } from "./rate-limit";

const COOKIE = "int_admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const secret = () => process.env.ADMIN_SECRET ?? "";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");
const sha = (s: string) => createHash("sha256").update(s).digest();

function safeShaEqual(a: string, b: string): boolean {
  const left = sha(a);
  const right = sha(b);
  return timingSafeEqual(left, right);
}

export type AdminAccount = {
  id: number;
  username: string;
  label: string;
  active: boolean;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type AdminCredential = {
  id: number | null;
  username: string;
  role: string;
  source: "env" | "db";
};

function envFallbackActive(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && process.env.ADMIN_PASSWORD_ENABLED !== "0";
}

export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const rows = (await sql`
    select id, username, label, active, role, created_at, updated_at, last_login_at
    from admin_accounts order by id
  `) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    label: String(row.label ?? ""),
    active: Boolean(row.active),
    role: String(row.role ?? "operator"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
  }));
}

/**
 * ADMIN_PASSWORD tetap diterima sebagai cadangan anti-terkunci, kecuali
 * ADMIN_PASSWORD_ENABLED=0. Akun database dicek setelahnya dengan async
 * scrypt supaya banyak akun tidak memblokir event loop.
 */
export async function verifyAdminCredential(password: string): Promise<AdminCredential | null> {
  if (!password) return null;
  if (envFallbackActive() && safeShaEqual(password, String(process.env.ADMIN_PASSWORD))) {
    return { id: null, username: "admin (env)", role: "owner", source: "env" };
  }
  const rows = (await sql`
    select id, username, label, role, password_hash from admin_accounts where active = true
  `) as Array<Record<string, unknown>>;
  for (const row of rows) {
    if (await verifyPasswordAsync(password, String(row.password_hash))) {
      return {
        id: Number(row.id),
        username: String(row.username),
        role: String(row.role ?? "operator"),
        source: "db",
      };
    }
  }
  return null;
}

function sessionToken(id: number, version: number, expiresAt: number): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = `${id}.${version}.${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

function parseSession(token: string | undefined): { id: number; version: number; exp: number } | null {
  if (!secret() || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const id = Number(parts[0]);
  const version = Number(parts[1]);
  const exp = Number(parts[2]);
  if (!Number.isInteger(id) || id < 0 || !Number.isInteger(version) || version < 0) return null;
  if (!Number.isFinite(exp) || exp <= Date.now()) return null;
  if (!/^[0-9a-f]{16}$/i.test(parts[3])) return null;
  const expected = Buffer.from(sign(parts.slice(0, 4).join(".")));
  const actual = Buffer.from(parts[4]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id, version, exp };
}

/** Akun yang sedang login. Otoritas utama untuk isAdmin dan audit actor. */
export async function currentAdmin(): Promise<AdminCredential | null> {
  const session = parseSession((await cookies()).get(COOKIE)?.value);
  if (!session) return null;
  if (session.id === 0) {
    return envFallbackActive()
      ? { id: null, username: "admin (env)", role: "owner", source: "env" }
      : null;
  }
  const rows = (await sql`
    select id, username, role, active, token_version
    from admin_accounts
    where id = ${session.id} and active = true
  `) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row || !Boolean(row.active) || Number(row.token_version) !== session.version) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    role: String(row.role ?? "operator"),
    source: "db",
  };
}

/** Middleware Edge hanya bisa cek tanda tangan & expired; DB dicek di sini. */
export function sessionTokenValidForEdge(token: string | undefined): boolean {
  return parseSession(token) !== null;
}

export async function isAdmin(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

export async function login(password: string): Promise<boolean> {
  // Fail-closed: bila store rate limit bermasalah, login ditolak sementara
  // daripada membiarkan brute-force tanpa batas.
  const limited = await rateLimit(await clientKey("admin_login"), 6, 60_000).catch(() => ({
    ok: false as const,
    retryAfter: 10,
  }));
  if (!limited.ok) return false;

  const credential = await verifyAdminCredential(password).catch(() => null);
  if (!credential) {
    await audit("login_failed", "admin_session", null, { source: "password" }).catch(() => undefined);
    return false;
  }
  let version = 0;
  if (credential.source === "db" && credential.id) {
    const rows = (await sql`
      update admin_accounts set last_login_at = now()
      where id = ${credential.id} returning token_version
    `.catch(() => [])) as Array<{ token_version: string | number }>;
    version = Number(rows[0]?.token_version ?? 0);
  }
  (await cookies()).set(COOKIE, sessionToken(credential.id ?? 0, version, Date.now() + SESSION_MAX_AGE * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  await audit("login", "admin_session", credential.username, { source: credential.source });
  return true;
}

/** Logout mencabut sesi di server: cookie bocor tidak bisa dipakai lagi. */
export async function logout() {
  const session = parseSession((await cookies()).get(COOKIE)?.value);
  if (session && session.id > 0) {
    await sql`
      update admin_accounts set token_version = token_version + 1 where id = ${session.id}
    `.catch(() => undefined);
  }
  (await cookies()).delete(COOKIE);
}
