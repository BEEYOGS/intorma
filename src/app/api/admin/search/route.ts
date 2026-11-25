import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Butuh login admin." }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);

  const pages = [
    { title: "Pesanan", url: "/admin" },
    { title: "Analitik", url: "/admin/analitik" },
    { title: "Pelanggan", url: "/admin/pelanggan" },
    { title: "Layanan & harga", url: "/admin/layanan" },
    { title: "Log aktivitas", url: "/admin/audit" },
    { title: "Pengaturan", url: "/admin/pengaturan" },
    { title: "Lihat situs", url: "/" },
  ].filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()));

  if (!q) {
    return NextResponse.json({ pages, orders: [], services: [] });
  }

  const like = `%${q}%`;
  const [orders, services] = await Promise.all([
    sql.query(
      `select code, name, status from orders
       where code ilike $1 or name ilike $1 or wa ilike $1
       order by created_at desc limit 8`,
      [like],
    ),
    sql.query(
      `select id, name, active from services
       where id ilike $1 or name ilike $1
       order by sort asc, name asc limit 8`,
      [like],
    ),
  ]);

  return NextResponse.json({
    pages,
    orders: orders.map((r) => ({ code: r.code, name: r.name, status: r.status })),
    services: services.map((r) => ({ id: r.id, name: r.name, active: r.active })),
  });
}