import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { sendWA, siteUrl } from "@/lib/wa";

/**
 * Webhook open-wa. Jalankan open-wa dengan:  -w "https://domainmu/api/wa/webhook?s=SECRET"
 * Klien bisa balas "status INT-ABC123" dan langsung dapat status terbarunya.
 */
export async function POST(req: Request) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("s") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const msg = payload?.data;
  if (payload?.event !== "onMessage" || !msg || msg.fromMe || msg.isGroupMsg) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const match = String(msg.body ?? "").match(/status\s+(?:INT-)?([A-Z0-9]{6})/i);
  if (!match) return NextResponse.json({ ok: true, ignored: true });

  const code = `INT-${match[1].toUpperCase()}`;
  const order = (await sql`select code, status, price, note from orders where code = ${code}`)[0];

  const reply = order
    ? [
        `Pesanan ${order.code}: ${STATUS_META[(isStatus(order.status) ? order.status : "menunggu") as Status].label}`,
        order.price ? `Harga: ${rupiah(order.price)}` : null,
        order.note ? `Catatan: ${order.note}` : null,
        `Detail: ${siteUrl()}/lacak/${order.code}`,
      ].filter(Boolean).join("\n")
    : `Kode ${code} tidak ditemukan. Cek lagi kodenya.`;

  await sendWA(String(msg.from).replace(/@.*/, ""), reply);
  return NextResponse.json({ ok: true });
}
