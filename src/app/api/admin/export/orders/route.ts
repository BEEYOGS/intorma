import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value).replace(/"/g, '""');
  // Excel/Sheets mengevaluasi sel yang diawali simbol ini sebagai rumus.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Butuh login admin." }, { status: 401 });
  }
  const url = new URL(req.url);
  // Default 30 hari: ekspor seluruh riwayat butuh pilihan eksplisit.
  const range = url.searchParams.get("range") ?? "30";
  const all = range === "all";
  const days = all ? 0 : Math.min(3650, Math.max(1, Number(range) || 30));
  const values: string[] = [];
  let where = "";
  if (!all) {
    const c = new Date();
    c.setDate(c.getDate() - days);
    c.setHours(0, 0, 0, 0);
    values.push(c.toISOString());
    where = "where o.created_at >= $1";
  }

  const rows = await sql.query(
    `select o.code, o.name, o.wa, coalesce(s.name, o.service_label) as service,
            o.status, o.price, o.paid, o.paid_at, o.qty, o.width_cm, o.height_cm,
            o.subtotal, o.note, o.created_at, o.updated_at, o.deadline, o.deadline_at,
            o.promo_code, o.discount_amount
     from orders o left join services s on s.id = o.service_id
     ${where}
     order by o.created_at desc
     limit 5000`,
    values,
  );

  const header = [
    "kode", "nama", "whatsapp", "layanan", "status", "harga", "lunas", "dibayar_pada",
    "qty", "lebar_cm", "tinggi_cm", "subtotal", "promo", "diskon", "catatan",
    "dibuat", "diupdate", "deadline", "deadline_jam",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.code, r.name, r.wa, r.service, r.status, r.price, r.paid, r.paid_at,
        r.qty, r.width_cm, r.height_cm, r.subtotal, r.promo_code, r.discount_amount,
        r.note, r.created_at, r.updated_at, r.deadline, r.deadline_at,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  await audit("export", "orders", `${rows.length} baris`, { range, all }).catch(() => undefined);
  const filename = `pesanan-${all ? "semua" : range + "hari"}.csv`;
  // BOM UTF-8 supaya Excel Indonesia membaca karakter lokal dengan benar.
  return new NextResponse(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}