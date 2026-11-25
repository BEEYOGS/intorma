import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { normalizeCode } from "@/lib/codes";
import { getPaymentSettings, paymentLines } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { sendWA, siteUrl } from "@/lib/wa";

export async function POST(req: Request) {
  const secret = process.env.WA_WEBHOOK_SECRET || process.env.OPENWA_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("s") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const payload = await req.json().catch(() => null);
  // OpenWA mengirim { event, data }, Fonnte mengirim { sender, message, ... }.
  const isFonnte = Boolean(payload && !payload.event && typeof payload.sender === "string");
  const msg = isFonnte ? payload : payload?.data;
  if (!isFonnte && (payload?.event !== "message.received" || !msg)) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const from = isFonnte ? String(payload.sender ?? "") : String(msg?.from ?? msg?.chatId ?? "");
  const isGroup =
    msg?.isGroup === true ||
    msg?.isGroupMsg === true ||
    from.endsWith("@g.us") ||
    (isFonnte && Boolean(payload.member));
  if (!from || (!isFonnte && msg?.fromMe === true) || isGroup) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const body = String(
    isFonnte ? payload.message ?? "" : msg?.body ?? msg?.text ?? msg?.content ?? "",
  );
  const match = body.match(/status\s*[:#-]?\s*(?:INT[-\s]?)?([A-Z0-9]{6,})/i);
  if (!match) return NextResponse.json({ ok: true, ignored: true });
  const code = normalizeCode(match[1]);
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
  await sendWA(from.replace(/@.*/, ""), reply);
  return NextResponse.json({ ok: true });
}
