import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const code = kode.toUpperCase();
  const rows = await sql`
    select status, price, paid, updated_at from orders where code = ${code}
  `;
  const r = rows[0];
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    status: r.status,
    price: r.price,
    paid: r.paid,
    updatedAt: r.updated_at,
  });
}