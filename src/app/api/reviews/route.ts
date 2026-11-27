import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { normalizeCode } from "@/lib/codes";
import { clientErrorMessage } from "@/lib/error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await sql`
      select r.id, r.name, r.rating, r.comment, r.created_at, o.code as order_code,
        coalesce(s.name, o.service_label) as service
      from reviews r
      left join orders o on o.id = r.order_id
      left join services s on s.id = o.service_id
      where r.approved = true
      order by r.created_at desc
      limit 12
    `;
    return NextResponse.json({ reviews: rows });
  } catch (error) {
    return NextResponse.json(
      { error: clientErrorMessage(error, "Gagal memuat ulasan.") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const codeRaw = typeof data.code === "string" ? data.code.trim() : "";
  const code = codeRaw ? normalizeCode(codeRaw) : null;
  const rating = Number(data.rating);
  const comment = typeof data.comment === "string" ? data.comment.trim() : "";
  const nameInput = typeof data.name === "string" ? data.name.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating harus 1–5." }, { status: 400 });
  }
  if (comment.length < 10 || comment.length > 1000) {
    return NextResponse.json({ error: "Ulasan harus 10–1000 karakter." }, { status: 400 });
  }

  const customer = await getCustomer().catch(() => null);

  let order: { id: number; name: string; customer_id: number | null } | undefined;
  if (code) {
    const rows = (await sql`
      select id, name, customer_id from orders where code = ${code}
    `) as Array<{ id: number; name: string; customer_id: number | null }>;
    order = rows[0];
    if (!order) {
      return NextResponse.json({ error: "Kode pesanan tidak ditemukan." }, { status: 404 });
    }
  }

  const name = nameInput || order?.name || customer?.name || "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Nama wajib diisi (2–80 karakter)." }, { status: 400 });
  }

  // Cegah ulasan ganda dari pesanan yang sama.
  if (order) {
    const existing = (await sql`select id from reviews where order_id = ${order.id}`)[0];
    if (existing) {
      return NextResponse.json({ error: "Ulasan untuk pesanan ini sudah dikirim." }, { status: 409 });
    }
  }

  try {
    await sql`
      insert into reviews (order_id, customer_id, name, rating, comment, approved)
      values (
        ${order?.id ?? null},
        ${customer?.id ?? order?.customer_id ?? null},
        ${name},
        ${rating},
        ${comment},
        false
      )
    `;
    return NextResponse.json({ ok: true, pending: true });
  } catch (error) {
    return NextResponse.json(
      { error: clientErrorMessage(error, "Gagal menyimpan ulasan.") },
      { status: 500 },
    );
  }
}
