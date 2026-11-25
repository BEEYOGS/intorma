import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Butuh login admin." }, { status: 401 });
  }
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "all";
  let where = "";
  const values: string[] = [];
  if (range !== "all") {
    const days = Number(range);
    if (Number.isFinite(days) && days > 0) {
      const c = new Date();
      c.setDate(c.getDate() - days);
      c.setHours(0, 0, 0, 0);
      values.push(c.toISOString());
      where = "where o.created_at >= $1";
    }
  }

  const rows = await sql.query(
    `select o.code, o.name, o.wa, coalesce(s.name, o.service_label) as service,
            o.status, o.price, o.paid, o.paid_at, o.qty, o.width_cm, o.height_cm,
            o.subtotal, o.note, o.created_at, o.updated_at, o.deadline
     from orders o left join services s on s.id = o.service_id
     ${where}
     order by o.created_at desc`,
    values,
  );

  const header = [
    "kode", "nama", "whatsapp", "layanan", "status", "harga", "lunas", "dibayar_pada",
    "qty", "lebar_cm", "tinggi_cm", "subtotal", "catatan", "dibuat", "diupdate", "deadline",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.code, r.name, r.wa, r.service, r.status, r.price, r.paid, r.paid_at,
        r.qty, r.width_cm, r.height_cm, r.subtotal, r.note, r.created_at, r.updated_at, r.deadline,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const filename = `pesanan-${range === "all" ? "semua" : range + "hari"}.csv`;
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}