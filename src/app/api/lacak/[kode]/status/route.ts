import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { isValidCode, normalizeCode } from "@/lib/codes";
import { cleanAccessToken, hasOrderAccess } from "@/lib/order-access";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const limited = await guardRate("lacak_status", 30);
  if (limited) return limited;
  const { kode } = await params;
  const code = normalizeCode(kode);
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });
  }
  const rows = await sql`
    select status, price, paid, updated_at, access_token, customer_id from orders where code = ${code}
  `;
  const r = rows[0];
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await hasOrderAccess(r, cleanAccessToken(new URL(req.url).searchParams.get("t"))))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    {
      status: r.status,
      price: r.price,
      paid: r.paid,
      updatedAt: r.updated_at,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}