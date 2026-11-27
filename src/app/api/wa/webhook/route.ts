import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { normalizeWA, rupiah, tanggalHariIni } from "@/lib/format";
import { normalizeCode } from "@/lib/codes";
import { withAccess } from "@/lib/order-access";
import { getPaymentSettings, paymentLines } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

function webhookSecret() {
  return (process.env.WA_WEBHOOK_SECRET || process.env.OPENWA_WEBHOOK_SECRET || "").trim();
}

function signatureValid(signature: string, digest: string): boolean {
  const a = Buffer.from(signature);
  const b = Buffer.from(digest);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secretEqual(given: string, expected: string): boolean {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Meta mengirim GET subscribe sekali saat webhook didaftarkan. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const expected = (process.env.META_WA_VERIFY_TOKEN || webhookSecret()).trim();
  const challenge = params.get("hub.challenge");
  if (
    !expected ||
    params.get("hub.mode") !== "subscribe" ||
    !secretEqual(params.get("hub.verify_token") ?? "", expected) ||
    !challenge
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

type CloudInbound = { from: string; body: string; id: string; media: boolean };

function cloudInbound(payload: unknown): CloudInbound[] {
  const changes = (payload as { entry?: Array<{ changes?: unknown[] }> })?.entry?.flatMap(
    (entry) => entry?.changes ?? [],
  ) ?? [];
  const found: CloudInbound[] = [];
  const seen = new Set<string>();
  for (const change of changes) {
    const value = (change as { value?: { messages?: unknown[] } })?.value;
    for (const item of value?.messages ?? []) {
      const message = item as { from?: string; id?: string; text?: { body?: string }; type?: string };
      if (!message?.from) continue;
      const id = String(message.id ?? "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      const body = String(message.text?.body ?? "");
      found.push({
        from: message.from,
        id,
        body,
        media: !body && message.type !== "text",
      });
    }
  }
  return found;
}

async function statusReply(body: string, from: string): Promise<string | null> {
  const match = body.match(/status\s*[:#-]?\s*(?:INT[-\s]?)?([A-Z0-9]{6,})/i);
  if (!match) return null;

  const code = normalizeCode(match[1]);
  const order = (await sql`select code, status, price, note, paid, wa, access_token from orders where code = ${code}`)[0] as
    | {
        code: string;
        status: string;
        price: number | string | null;
        note: string | null;
        paid: boolean;
        wa: string;
        access_token: string | null;
      }
    | undefined;
  if (!order) return `Kode ${code} tidak ditemukan. Cek lagi kodenya.`;

  // Kode harian bisa ditebak. Balasan status hanya untuk nomor yang memang
  // terdaftar di pesanan, kalau nomornya tersimpan.
  const sender = normalizeWA(from.replace(/@.*/, ""));
  const orderWa = normalizeWA(String(order.wa ?? ""));
  const legacy = orderWa ? `0${orderWa.slice(2)}` : "";
  if (orderWa && sender !== orderWa && sender !== legacy) {
    return "Kode ini tidak cocok dengan nomor WhatsApp yang terdaftar.";
  }

  const payment = await getPaymentSettings();
  const lines: Array<string | null> = [
    `Pesanan ${order.code}: ${STATUS_META[(isStatus(order.status) ? order.status : "menunggu") as Status].label}`,
    order.price ? `Total: ${rupiah(Number(order.price))}` : null,
    order.price ? (order.paid ? "Pembayaran: lunas" : "Pembayaran: belum dibayar") : null,
    order.price && !order.paid && payment.enabled ? paymentLines(payment).join("\n") : null,
    order.note ? `Catatan: ${order.note}` : null,
    `Detail: ${siteUrl()}${withAccess(`/lacak/${order.code}`, order.access_token)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

async function forwardInbound(from: string, body: string, media: boolean): Promise<void> {
  const admin = adminWhatsApp();
  const fromNumber = normalizeWA(from.replace(/@.*/, ""));
  const adminNumber = normalizeWA(admin);
  const text = body.trim() || (media ? "[Mengirim media / lampiran]" : "");
  if (!admin || !fromNumber || fromNumber === adminNumber || !text) return;

  const legacy = `0${fromNumber.slice(2)}`;
  const order = (await sql`
    select code, name from orders
    where wa = ${fromNumber} or wa = ${legacy}
    order by created_at desc limit 1
  `)[0] as { code: string; name: string } | undefined;
  if (!order) return;

  const key = `inbound-${fromNumber}-${tanggalHariIni()}`;
  const seen = await sql`select id from wa_outbox where idempotency_key = ${key} limit 1`;
  if (seen.length) return;

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

async function processMessage(from: string, body: string, media: boolean): Promise<void> {
  const sender = from.replace(/@.*/, "");
  const limited = await rateLimit(await clientKey(`wa_inbound:${sender}`), 6, 60_000).catch(() => null);
  if (limited && !limited.ok) return;

  const reply = await statusReply(body, sender).catch((error) => {
    console.error("wa status reply failed", error);
    return null;
  });
  if (reply) {
    await sendWA(sender, reply);
    return;
  }
  await forwardInbound(sender, body, media).catch((error) =>
    console.error("wa inbound forward failed", error),
  );
}

export async function POST(req: Request) {
  const limited = await rateLimit(await clientKey("wa_webhook"), 40, 60_000).catch(() => null);
  if (limited && !limited.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

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
    // Provider Cloud harus tanda tangan. Tanpa secret, payload siapa pun bisa
    // memicu balasan status order, jadi kita tolak lebih awal (fail closed).
    if (!appSecret) {
      return NextResponse.json(
        { ok: false, error: "META_WA_APP_SECRET belum dikonfigurasi." },
        { status: 503 },
      );
    }
    const digest = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    if (!signatureValid(signature, digest)) return NextResponse.json({ ok: false }, { status: 401 });
  } else {
    // Rahasia webhook hanya lewat header, tidak pernah query string.
    // OpenWA juga mengirim HMAC X-OpenWA-Signature atas body mentah bila secret
    // didaftarkan; itu diperiksa timbang-waktu dan lebih kuat dari header statis.
    const secret = webhookSecret();
    const headerSecret = req.headers.get("x-webhook-secret") ?? "";
    const openwaSignature = req.headers.get("x-openwa-signature") ?? "";
    const headerOk = Boolean(secret && secretEqual(headerSecret, secret));
    const signatureOk = Boolean(
      secret &&
        openwaSignature &&
        signatureValid(openwaSignature, `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`),
    );
    if (!secret || (!headerOk && !signatureOk)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  if (isCloud) {
    const messages = cloudInbound(payload);
    for (const message of messages) {
      if (message.from.endsWith("@g.us")) continue;
      await processMessage(message.from, message.body, message.media);
    }
    return NextResponse.json({ ok: true, processed: messages.length });
  }

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
  const body = String(isFonnte ? payload.message ?? "" : msg?.body ?? msg?.text ?? msg?.content ?? "");
  const media = isFonnte
    ? Boolean(payload.url || payload.file)
    : Boolean(msg?.media || msg?.mimetype || msg?.hasMedia);
  await processMessage(from, body, media);
  return NextResponse.json({ ok: true });
}
