import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { gatewayEnabled, isSettlement, midtransSignature } from "@/lib/payment";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

export const runtime = "nodejs";

type MidtransPayload = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  transaction_id?: string;
  payment_type?: string;
  fraud_status?: string;
};

export async function POST(req: Request) {
  if (!gatewayEnabled()) return NextResponse.json({ ok: false }, { status: 503 });

  const payload = (await req.json().catch(() => null)) as MidtransPayload | null;
  if (!payload?.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
    return NextResponse.json({ ok: false, error: "Payload tidak lengkap." }, { status: 400 });
  }

  const expected = midtransSignature(payload.order_id, payload.status_code, payload.gross_amount);
  if (expected !== payload.signature_key) {
    return NextResponse.json({ ok: false, error: "Signature tidak cocok." }, { status: 403 });
  }

  const code = payload.order_id.toUpperCase();
  const order = (await sql`
    select id, code, name, wa, price, paid, status from orders where code = ${code}
  `)[0] as { id: number; code: string; name: string; wa: string; price: number | null; paid: boolean; status: string } | undefined;
  if (!order) return NextResponse.json({ ok: true, ignored: true });

  if (!isSettlement(payload.transaction_status ?? "") || payload.fraud_status === "challenge") {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (order.paid) return NextResponse.json({ ok: true, already: true });

  const paidAt = new Date();
  await sql`
    update orders set paid = true, paid_at = ${paidAt}, payment_status = 'paid', updated_at = now()
    where id = ${order.id}`;
  await sql`
    insert into order_events (order_id, status, note)
    values (${order.id}, ${order.status}, 'Pembayaran diterima via Midtrans')`;

  const updated = await sql`
    update payments set status = 'paid', paid_at = ${paidAt}, reference = ${payload.transaction_id ?? null},
      raw = ${JSON.stringify(payload)}::jsonb
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'
    returning id`;
  if (!updated.length) {
    await sql`
      insert into payments (order_id, provider, method, amount, status, reference, raw, paid_at)
      values (${order.id}, 'midtrans', ${payload.payment_type ?? "snap"}, ${order.price ?? 0}, 'paid',
        ${payload.transaction_id ?? null}, ${JSON.stringify(payload)}::jsonb, ${paidAt})`;
  }

  const link = `${siteUrl()}/lacak/${order.code}`;
  await Promise.all([
    sendWA(order.wa, `Halo ${order.name}, pembayaran pesanan ${order.code} sebesar ${rupiah(Number(order.price ?? 0))} sudah kami terima. Terima kasih!\n\nPantau: ${link}`),
    adminWhatsApp()
      ? sendWA(adminWhatsApp(), `Pembayaran masuk via Midtrans untuk ${order.code} — ${order.name}.\nTotal: ${rupiah(Number(order.price ?? 0))}`)
      : Promise.resolve(false),
  ]);

  revalidatePath(`/lacak/${order.code}`);
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
