import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "int_admin";

function signatureBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(new ArrayBuffer(32));
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Lapisan pertama pertahanan area admin. isAdmin() di page/action/API tetap
 * menjadi otoritas utama; middleware ini hanya memastikan cookie asal sembarang
 * tidak lolos lebih awal. Web Crypto dipakai karena middleware berjalan di Edge.
 */
async function adminCookieValid(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const token = request.cookies.get(COOKIE)?.value;
  if (!secret || !token) return false;
  const signature = signatureBytes(token);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode("admin"));
}

const RATE_LIMITS: Array<{ test: (path: string, method: string) => boolean; limit: number; windowMs: number }> = [
  { test: (path, method) => path === "/admin/login" && method === "POST", limit: 10, windowMs: 60_000 },
  { test: (path) => path.startsWith("/api/drive/"), limit: 30, windowMs: 60_000 },
  { test: (path) => path.startsWith("/api/admin/"), limit: 60, windowMs: 60_000 },
  { test: (path) => path === "/api/wa/test-gateway", limit: 10, windowMs: 60_000 },
];

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function rateLimit(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const method = request.method;
  const rule = RATE_LIMITS.find((item) => item.test(path, method));
  if (!rule) return null;

  const now = Date.now();
  const key = `${clientIp(request)}:${path}`;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }
  if (bucket.count >= rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  bucket.count += 1;
  return null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rate limit berlaku untuk semua path yang cocok, sebelum cek auth.
  const limited = rateLimit(request);
  if (limited) return limited;

  if (path !== "/admin" && !path.startsWith("/admin/")) return NextResponse.next();
  if (path === "/admin/login") return NextResponse.next();
  if (await adminCookieValid(request)) return NextResponse.next();

  // Server action dan API tidak boleh menerima redirect HTML.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/:path*"] };
