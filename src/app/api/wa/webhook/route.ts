import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeWA, rupiah, tanggalHariIni } from "@/lib/format";
import { normalizeCode } from "@/lib/codes";
import { getPaymentSettings, paymentLines } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

function webhookSecret() {
  return (process.env.WA_WEBHOOK_SECRET || process.env.OPENWA_WEBHOOK_SECRET || "").trim();
}

function signatureValid(signature: string, digest: string) {
  const a = Buffer.from(signature);
  const b = Buffer.from(digest);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Meta mengirim GET subscribe sekali saat webhook didaftarkan. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const expected = (process.env.META_WA_VERIFY_TOKEN || webhookSecret()).trim();
  const challenge = params.get("hub.challenge");
  if (
    !expected ||
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== expected ||
    !challenge
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

type CloudInbound = { from: string; body: string; media: boolean };

function cloudInbound(payload: unknown): CloudInbound | null {
  const changes = (payload as { entry?: Array<{ changes?: unknown[] }> })?.entry?.flatMap(
    (entry) => entry?.changes ?? [],
  ) ?? [];
  for (const change of changes) {
    const value = (change as { value?: { messages?: unknown[] } })?.value;
    const messages = value?.messages ?? [];
    for (const item of messages) {
      const message = item as { from?: string; text?: { body?: string }; type?: string };
      if (!message?.from) continue;
      const body = String(message.text?.body ?? "");
      return { from: message.from, body, media: !body && message.type !== "text" };
    }
  }
  return null;
}

export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    /* payload bukan JSON */
  }
  const isCloud = Boolean(payload && payload.object === "whatsapp_business_account");

  if (isCloud) {
    const appSecret = (process.env.META_WA_APP_SECRET || "").trim();
    if (appSecret) {
      const digest = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
      const signature = req.headers.get("x-hub-signature-256") ?? "";
      if (!signatureValid(signature, digest)) return NextResponse.json({ ok: false }, { status: 401 });
    }
  } else {
    const secret = webhookSecret();
    if (!secret || new URL(req.url).searchParams.get("s") !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const cloud = isCloud ? cloudInbound(payload) : null;
  // OpenWA mengirim { event, data }, Fonnte mengirim { sender, message, ... }.
  const isFonnte = !isCloud && Boolean(payload && !payload.event && typeof payload.sender === "string");
  const msg = isCloud ? cloud : isFonnte ? payload : payload?.data;
  if (!isCloud && !isFonnte && (payload?.event !== "message.received" || !msg)) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (isCloud && !cloud) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const from = isCloud
    ? cloud!.from
    : isFonnte
      ? String(payload.sender ?? "")
      : String(msg?.from ?? msg?.chatId ?? "");
  const isGroup =
    msg?.isGroup === true ||
    msg?.isGroupMsg === true ||
    from.endsWith("@g.us") ||
    (isFonnte && Boolean(payload.member));
  if (!from || (!isFonnte && !isCloud && msg?.fromMe === true) || isGroup) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const body = isCloud
    ? cloud!.body
    : String(isFonnte ? payload.message ?? "" : msg?.body ?? msg?.text ?? msg?.content ?? "");
  const match = body.match(/status\s*[:#-]?\s*(?:INT[-\s]?)?([A-Z0-9]{6,})/i);
  if (!match) {
    // Balasan klien yang bukan perintah status bisa berisi perubahan brief atau
    // bukti transfer. Teruskan ke admin, tapi maksimal sekali per nomor per hari
    // supaya tidak membanjiri WhatsApp dan menghabiskan kuota Fonnte.
    const admin = adminWhatsApp();
    const fromNumber = normalizeWA(from.replace(/@.*/, ""));
    const adminNumber = normalizeWA(admin);
    const media = isFonnte
      ? Boolean(payload.url || payload.file)
      : Boolean(msg?.media || msg?.mimetype || msg?.hasMedia);
    const text = body.trim() || (media ? "[Mengirim media / lampiran]" : "");
    if (admin && fromNumber && fromNumber !== adminNumber && text) {
      const legacy = `0${fromNumber.slice(2)}`;
      const order = (await sql`
        select code, name from orders
        where wa = ${fromNumber} or wa = ${legacy}
        order by created_at desc limit 1
      `)[0];
      if (order) {
        const key = `inbound-${fromNumber}-${tanggalHariIni()}`;
        const seen = await sql`select id from wa_outbox where idempotency_key = ${key} limit 1`;
        if (!seen.length) {
          const message = [
            `Pesan baru dari ${order.name} (${order.code})`,
            "",
            text.slice(0, 1200),
            "",
            `Balas: https://wa.me/${fromNumber}`,
          ].join("\n");
          const ok = await sendWA(admin, message);
          await sql`
            insert into wa_outbox (to_number, content, status, attempts, last_error, idempotency_key, sent_at)
            values (${adminNumber || admin}, ${message}, ${ok ? "sent" : "failed"}, 1,
              ${ok ? null : "Gagal mengirim langsung via gateway"}, ${key}, ${ok ? new Date() : null})
            on conflict (idempotency_key) where idempotency_key is not null do nothing`;
        }
      }
    }
    return NextResponse.json({ ok: true, ignored: true });
  }
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
