import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { isValidCode, normalizeCode } from "@/lib/codes";
import { cleanAccessToken, hasOrderAccess } from "@/lib/order-access";
import { sql } from "@/lib/db";
import { getCoreStatus, isSettlement } from "@/lib/payment";
import { settleMidtransPayment } from "@/lib/payment-settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoreStatus = NonNullable<Awaited<ReturnType<typeof getCoreStatus>>>;
const statusCache = new Map<string, { at: number; value: CoreStatus | null }>();
const STATUS_TTL_MS = 10_000;

/** Polling dan panggilan langsung yang berulang tidak boleh menyerbu Midtrans. */
async function coreStatusCached(orderId: string) {
  const now = Date.now();
  const hit = statusCache.get(orderId);
  if (hit && now - hit.at < STATUS_TTL_MS) return hit.value;
  const value = await getCoreStatus(orderId).catch(() => null);
  statusCache.set(orderId, { at: now, value });
  // Bersihkan entri kedaluwarsa tanpa menunggu ukuran map mencapai batas.
  for (const [key, entry] of statusCache) {
    if (now - entry.at > STATUS_TTL_MS) statusCache.delete(key);
  }
  return value;
}

/**
 * Polling ringan untuk halaman pembayaran. Kalau webhook telat, endpoint ini
 * ikut menanyakan status ke Midtrans lalu menyelesaikan pesanan.
 */
export async function GET(req: Request) {
  const limited = await guardRate("payment_status", 40);
  if (limited) return limited;
  const url = new URL(req.url);
  const code = normalizeCode(url.searchParams.get("code") ?? "");
  const accessToken = cleanAccessToken(url.searchParams.get("t"));
  if (!isValidCode(code)) {
    return NextResponse.json({ ok: false, error: "Kode tidak valid." }, { status: 400 });
  }

  const order = (await sql`
    select id, code, paid, status, price, access_token, customer_id from orders where code = ${code}
  `)[0] as
    | {
        id: number;
        code: string;
        paid: boolean;
        status: string;
        price: number | null;
        access_token: string | null;
        customer_id: number | null;
      }
    | undefined;
  if (!order) return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!(await hasOrderAccess(order, accessToken))) {
    return NextResponse.json({ ok: false, error: "Butuh tautan pribadi pesanan." }, { status: 403 });
  }
  if (order.paid) return NextResponse.json({ ok: true, paid: true, orderStatus: order.status });

  const pending = (await sql`
    select id, method,
      coalesce(raw->>'order_id_used', raw->>'orderIdUsed') as order_id_used,
      coalesce(raw->>'expires_at', raw->>'expiresAt') as expires_at, created_at
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

  const status = await coreStatusCached(pending.order_id_used);
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

  if (["expire", "cancel", "deny", "chargeback", "refund", "failure"].includes(status.transactionStatus)) {
    // Jalur yang sama dengan webhook: menandai failed dan membatalkan reversal
    // bila order sempat lunas.
    const settled = await settleMidtransPayment({
      orderId: pending.order_id_used,
      transactionStatus: status.transactionStatus,
      fraudStatus: status.fraudStatus,
      grossAmount: status.grossAmount,
      transactionId: status.transactionId,
      paymentType: status.paymentType,
      raw: status,
    });
    if (settled.reason !== "reversed") {
      await sql`update payments set status = 'failed' where id = ${pending.id} and status = 'pending'`;
    }
    const fresh = (await sql`select paid, status from orders where id = ${order.id}`)[0] as
      | { paid: boolean; status: string }
      | undefined;
    return NextResponse.json({
      ok: true,
      paid: Boolean(fresh?.paid),
      orderStatus: fresh?.status ?? order.status,
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
