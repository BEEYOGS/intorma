import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { getPaymentSettings, paymentLines } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { sendWA, siteUrl } from "@/lib/wa";

/**
 * Webhook OpenWA gateway. Daftarkan webhook per sesi ke:
 *   https://domainmu/api/wa/webhook?s=SECRET
 * Klien bisa balas "status INT-ABC123" dan langsung dapat status terbarunya.
 *
 * Payload OpenWA: { event: "message.received", sessionId, data: { id, from, body, ... } }
 */
export async function POST(req: Request) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("s") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const msg = payload?.data;
  if (payload?.event !== "message.received" || !msg) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const from = String(msg.from ?? msg.chatId ?? "");
  const isGroup = msg.isGroup === true || msg.isGroupMsg === true || from.endsWith("@g.us");
  if (!from || msg.fromMe === true || isGroup) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const body = String(msg.body ?? msg.text ?? msg.content ?? "");
  const match = body.match(/status\s+(?:INT-)?([A-Z0-9]{6})/i);
  if (!match) return NextResponse.json({ ok: true, ignored: true });

  const code = `INT-${match[1].toUpperCase()}`;
  const order = (await sql`select code, status, price, note, paid from orders where code = ${code}`)[0];

  let reply: string;
  if (!order) {
    reply = `Kode ${code} tidak ditemukan. Cek lagi kodenya.`;
  } else {
    const payment = await getPaymentSettings();
    const lines: Array<string | null> = [
      `Pesanan ${order.code}: ${STATUS_META[(isStatus(order.status) ? order.status : "menunggu") as Status].label}`,
      order.price ? `Total: ${rupiah(order.price)}` : null,
      order.price ? (order.paid ? "Pembayaran: lunas" : "Pembayaran: belum dibayar") : null,
      order.price && !order.paid && payment.enabled ? paymentLines(payment).join("\n") : null,
      order.note ? `Catatan: ${order.note}` : null,
      `Detail: ${siteUrl()}/lacak/${order.code}`,
    ];
    reply = lines.filter(Boolean).join("\n");
  }

  await sendWA(String(msg.from).replace(/@.*/, ""), reply);
  return NextResponse.json({ ok: true });
}
