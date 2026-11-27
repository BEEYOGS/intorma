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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path !== "/admin" && !path.startsWith("/admin/")) return NextResponse.next();
  if (path === "/admin/login") return NextResponse.next();
  if (await adminCookieValid(request)) return NextResponse.next();

  // Server action dan API tidak boleh menerima redirect HTML.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
