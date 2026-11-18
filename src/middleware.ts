import { NextResponse, type NextRequest } from "next/server";

/**
 * Gerbang pertama untuk area admin. Pemeriksaan tanda tangan cookie tetap
 * dilakukan di src/lib/auth.ts pada setiap halaman/server action.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path !== "/admin/login" && !request.cookies.has("int_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
