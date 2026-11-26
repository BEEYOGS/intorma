import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCoreStatus, isSettlement } from "@/lib/payment";
import { settleMidtransPayment } from "@/lib/payment-settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polling ringan untuk halaman pembayaran. Kalau webhook telat, endpoint ini
 * ikut menanyakan status ke Midtrans lalu menyelesaikan pesanan.
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!/^INT-[A-Z0-9-]{4,24}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "Kode tidak valid." }, { status: 400 });
  }

  const order = (await sql`
    select id, code, paid, status, price from orders where code = ${code}
  `)[0] as
    | { id: number; code: string; paid: boolean; status: string; price: number | null }
    | undefined;
  if (!order) return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (order.paid) return NextResponse.json({ ok: true, paid: true, orderStatus: order.status });

  const pending = (await sql`
    select id, method, raw->>'order_id_used' as order_id_used,
      raw->>'expires_at' as expires_at, created_at
    from payments
    where order_id = ${order.id} and provider = 'midtrans' and status = 'pending'
    order by created_at desc
    limit 1
  `)[0] as
    | { id: number; method: string; order_id_used: string | null; expires_at: string | null; created_at: string }
    | undefined;

  if (!pending?.order_id_used) {
    return NextResponse.json({ ok: true, paid: false, orderStatus: order.status, pending: false });
  }

  const status = await getCoreStatus(pending.order_id_used).catch(() => null);
  if (!status) {
    return NextResponse.json({
      ok: true,
      paid: false,
      orderStatus: order.status,
      pending: true,
      method: pending.method,
      expiresAt: pending.expires_at,
    });
  }

  if (isSettlement(status.transactionStatus)) {
    const result = await settleMidtransPayment({
      orderId: pending.order_id_used,
      transactionStatus: status.transactionStatus,
      fraudStatus: status.fraudStatus,
      grossAmount: status.grossAmount,
      transactionId: status.transactionId,
      paymentType: status.paymentType,
      raw: status,
    });
    const fresh = (await sql`select paid, status from orders where id = ${order.id}`)[0] as
      | { paid: boolean; status: string }
      | undefined;
    return NextResponse.json({
      ok: result.ok,
      paid: Boolean(fresh?.paid),
      orderStatus: fresh?.status ?? order.status,
      reason: result.reason,
    });
  }

  if (["expire", "cancel", "deny", "failure"].includes(status.transactionStatus)) {
    await sql`update payments set status = 'failed' where id = ${pending.id} and status = 'pending'`;
    return NextResponse.json({
      ok: true,
      paid: false,
      orderStatus: order.status,
      pending: false,
      expired: true,
      transactionStatus: status.transactionStatus,
    });
  }

  return NextResponse.json({
    ok: true,
    paid: false,
    orderStatus: order.status,
    pending: true,
    method: pending.method,
    expiresAt: pending.expires_at,
    transactionStatus: status.transactionStatus,
  });
}
