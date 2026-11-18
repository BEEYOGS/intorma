import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "int_admin";
const sign = () => createHmac("sha256", process.env.ADMIN_SECRET ?? "").update("admin").digest("hex");
const sha = (s: string) => createHash("sha256").update(s).digest();

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_SECRET) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sign());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login(password: string): Promise<boolean> {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || !process.env.ADMIN_SECRET) return false;
  if (!timingSafeEqual(sha(password), sha(real))) return false;
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
