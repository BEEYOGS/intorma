import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "./db";

/**
 * Rate limit di dalam server action, bukan hanya middleware. Server action
 * bisa dipanggil lewat POST ke halaman mana pun, jadi pembatasan berbasis path
 * saja bisa dilewati. Store-nya Neon sehingga tetap benar di banyak instance.
 */
export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  // Vercel menulis header ini sendiri; lebih dipercaya daripada XFF yang
  // bisa dikirim klien. x-forwarded-for tetap dipakai sebagai cadangan.
  const forwarded = h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim().replace(/^\[|\].*$/g, "").replace(/:\d+$/, "");
  const ip = first || h.get("x-real-ip")?.trim() || "unknown";
  return `${scope}:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const rows = (await sql`
    insert into auth_rate_limits (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update
      set count = case
          when auth_rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then 1 else auth_rate_limits.count + 1 end,
        window_start = case
          when auth_rate_limits.window_start < now() - (${windowSeconds} || ' seconds')::interval
          then now() else auth_rate_limits.window_start end
    returning count, window_start
  `) as Array<{ count: string | number; window_start: string | Date }>;
  const row = rows[0];
  if (!row || Number(row.count) <= limit) return { ok: true };
  const elapsed = Date.now() - new Date(row.window_start).getTime();
  return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - elapsed) / 1000)) };
}

export function rateLimitMessage(result: Extract<RateLimitResult, { ok: false }>): string {
  return `Terlalu banyak percobaan. Coba lagi dalam ${result.retryAfter} detik.`;
}
