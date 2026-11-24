import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin/") && path !== "/admin/login" && !request.cookies.has("int_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (
    request.method !== "GET" &&
    path.startsWith("/admin/") &&
    path !== "/admin/login" &&
    !request.cookies.has("int_admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/contact"] };
