import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { getCoreStatus, gatewayEnabled, verifyMidtransSignature } from "@/lib/payment";
import { settleMidtransPayment } from "@/lib/payment-settle";

export const runtime = "nodejs";

type MidtransPayload = {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  transaction_id?: unknown;
  payment_type?: unknown;
  fraud_status?: unknown;
};

const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

export async function POST(req: Request) {
  const limited = await guardRate("payment_webhook", 60);
  if (limited) return limited;
  if (!gatewayEnabled()) return NextResponse.json({ ok: false }, { status: 503 });

  const payload = (await req.json().catch(() => null)) as MidtransPayload | null;
  if (!payload) return NextResponse.json({ ok: false, error: "Payload tidak valid." }, { status: 400 });

  const orderId = text(payload.order_id);
  const statusCode = text(payload.status_code);
  const grossAmount = text(payload.gross_amount);
  const signature = text(payload.signature_key);
  if (!/^INT-[A-Z0-9-]{6,60}$/i.test(orderId) || !statusCode || !grossAmount || !signature) {
    return NextResponse.json({ ok: false, error: "Payload tidak lengkap." }, { status: 400 });
  }
  if (!verifyMidtransSignature(orderId, statusCode, grossAmount, signature)) {
    return NextResponse.json({ ok: false, error: "Signature tidak cocok." }, { status: 403 });
  }

  // Challenge ke Status API: notifikasi bisa out-of-order/dimodifikasi.
  // Kalau Status API gagal, pakai payload hanya bila status_code=200 dan
  // fraud_status bukan challenge/deny.
  const fresh = await getCoreStatus(orderId).catch(() => null);
  const transactionStatus = fresh?.transactionStatus ?? text(payload.transaction_status);
  const fraudStatus = fresh?.fraudStatus || text(payload.fraud_status) || undefined;
  if (!fresh && (statusCode !== "200" || fraudStatus)) {
    return NextResponse.json({ ok: false, error: "Notifikasi belum diverifikasi." }, { status: 400 });
  }

  const result = await settleMidtransPayment({
    orderId,
    transactionStatus,
    fraudStatus,
    grossAmount: fresh?.grossAmount ?? grossAmount,
    transactionId: fresh?.transactionId || text(payload.transaction_id) || undefined,
    paymentType: fresh?.paymentType || text(payload.payment_type) || undefined,
    raw: fresh ?? payload,
  });

  const status = result.reason === "amount_mismatch" ? 409 : 200;
  return NextResponse.json(
    {
      ok: result.ok,
      code: result.code,
      reason: result.reason,
      already: result.already ?? false,
    },
    { status },
  );
}
