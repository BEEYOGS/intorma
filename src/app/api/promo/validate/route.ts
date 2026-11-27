import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { sql } from "@/lib/db";
import { clientErrorMessage } from "@/lib/error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await guardRate("promo_validate", 20);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const code = typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
  const amount = Number(data.amount);

  if (!code) return NextResponse.json({ error: "Kode promo wajib diisi." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Total pesanan belum tersedia." }, { status: 400 });
  }

  try {
    const rows = (await sql`
      select code, type, value, min_order, max_discount, usage_limit, used_count, active, expires_at
      from promo_codes
      where code = ${code}
    `) as Array<Record<string, unknown>>;

    const promo = rows[0];
    if (!promo) return NextResponse.json({ error: "Kode promo tidak ditemukan." }, { status: 404 });
    if (!promo.active) return NextResponse.json({ error: "Kode promo tidak aktif." }, { status: 400 });
    if (promo.expires_at && new Date(String(promo.expires_at)) < new Date()) {
      return NextResponse.json({ error: "Kode promo sudah kedaluwarsa." }, { status: 400 });
    }
    if (promo.usage_limit != null && Number(promo.used_count) >= Number(promo.usage_limit)) {
      return NextResponse.json({ error: "Kuota kode promo habis." }, { status: 400 });
    }
    if (amount < Number(promo.min_order ?? 0)) {
      return NextResponse.json(
        { error: `Minimal pesanan ${Number(promo.min_order).toLocaleString("id-ID")} untuk kode ini.` },
        { status: 400 },
      );
    }

    let discount = 0;
    if (promo.type === "percent") {
      discount = Math.round((amount * Number(promo.value)) / 100);
      if (promo.max_discount != null) discount = Math.min(discount, Number(promo.max_discount));
    } else {
      discount = Math.round(Number(promo.value));
    }
    discount = Math.max(0, Math.min(discount, amount));

    return NextResponse.json({
      ok: true,
      code: String(promo.code),
      type: String(promo.type),
      value: Number(promo.value),
      discount,
      final: amount - discount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: clientErrorMessage(error, "Gagal memvalidasi promo.") },
      { status: 500 },
    );
  }
}
