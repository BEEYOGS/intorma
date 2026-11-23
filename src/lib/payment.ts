import { createHash } from "crypto";
import { siteUrl } from "./wa";

export type GatewayOrder = {
  code: string;
  price: number;
  name: string;
  wa: string;
};

const serverKey = () => process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
const baseUrl = () =>
  process.env.MIDTRANS_IS_PRODUCTION === "1"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

export function gatewayEnabled(): boolean {
  return Boolean(serverKey());
}

export async function createMidtransTransaction(order: GatewayOrder): Promise<{ redirectUrl: string; token: string }> {
  const key = serverKey();
  if (!key) throw new Error("Payment gateway belum dikonfigurasi.");

  const response = await fetch(`${baseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: { order_id: order.code, gross_amount: Math.round(order.price) },
      customer_details: { first_name: order.name, phone: order.wa },
      callbacks: { finish: `${siteUrl()}/lacak/${order.code}?bayar=1` },
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gagal membuat transaksi pembayaran (${response.status}). ${detail.slice(0, 160)}`);
  }
  const data = (await response.json()) as { redirect_url?: string; token?: string };
  if (!data.redirect_url || !data.token) throw new Error("Respons payment gateway tidak valid.");
  return { redirectUrl: data.redirect_url, token: data.token };
}

export function midtransSignature(orderId: string, statusCode: string, grossAmount: string): string {
  const key = serverKey();
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${key}`).digest("hex");
}

export function isSettlement(status: string): boolean {
  return status === "settlement" || status === "capture";
}
