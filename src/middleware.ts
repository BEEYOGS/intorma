import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "int_admin";
const CODE_PATTERN = /^INT-(\d{9,}|[A-Z0-9]{6})$/;

function validOrderPathCode(segment: string): boolean {
  try {
    const raw = decodeURIComponent(segment).trim().toUpperCase().replace(/\s+/g, "");
    const body = raw.replace(/^INT-?/, "").replace(/-/g, "");
    return CODE_PATTERN.test(`INT-${body}`);
  } catch {
    return false;
  }
}

function signatureBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(new ArrayBuffer(32));
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Lapisan pertama pertahanan area admin. Token berisi id akun, token_version,
 * expired, dan nonce. Pencabutan sesi (token_version) dan status akun dicek
 * lebih lanjut oleh isAdmin()/currentAdmin() di sisi Node. Edge hanya
 * memverifikasi tanda tangan dan masa berlaku.
 *
 * Rate limiting sengaja tidak memakai Map di sini: tiap instance serverless
 * punya state sendiri dan hilang saat deploy. Pembatasan nyata ada di dalam
 * server action/route handler memakai auth_rate_limits di Neon.
 */
async function adminCookieValid(request: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const token = request.cookies.get(COOKIE)?.value;
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 5) return false;
  const id = Number(parts[0]);
  const version = Number(parts[1]);
  const exp = Number(parts[2]);
  if (!Number.isInteger(id) || id < 0 || !Number.isInteger(version) || version < 0) return false;
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  if (!/^[0-9a-f]{16}$/i.test(parts[3])) return false;
  const signature = signatureBytes(parts[4]);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(parts.slice(0, 4).join(".")),
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Validasi kode di edge: notFound() di halaman yang sudah streaming sering
  // keluar dengan status 200. Middleware memastikan 404 nyata sebelum render.
  const codeMatch = path.match(/^\/(?:lacak|nota|bayar)\/([^/]+)\/?$/);
  if (codeMatch && !validOrderPathCode(codeMatch[1])) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/not-found";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  if (path !== "/admin" && !path.startsWith("/admin/")) return NextResponse.next();
  if (path === "/admin/login") return NextResponse.next();
  if (await adminCookieValid(request)) return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/lacak/:code", "/nota/:code", "/bayar/:code"],
};
