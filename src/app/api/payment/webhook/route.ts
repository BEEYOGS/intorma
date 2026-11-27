import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { gatewayEnabled, midtransSignature } from "@/lib/payment";
import { settleMidtransPayment } from "@/lib/payment-settle";

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
  const expectedSig = Buffer.from(expected);
  const givenSig = Buffer.from(payload.signature_key);
  if (expectedSig.length !== givenSig.length || !timingSafeEqual(expectedSig, givenSig)) {
    return NextResponse.json({ ok: false, error: "Signature tidak cocok." }, { status: 403 });
  }

  const result = await settleMidtransPayment({
    orderId: payload.order_id,
    transactionStatus: payload.transaction_status ?? "",
    fraudStatus: payload.fraud_status,
    grossAmount: payload.gross_amount,
    transactionId: payload.transaction_id,
    paymentType: payload.payment_type,
    raw: payload,
  });

  // Nominal tidak cocok bukan alasan untuk menganggap webhook berhasil:
  // Midtrans perlu retry setelah harga/admin diperbaiki.
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
