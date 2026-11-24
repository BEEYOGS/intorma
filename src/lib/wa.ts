import { normalizeWA } from "./format";
import { sql } from "./db";

/**
 * Notifikasi WhatsApp memakai OpenWA (gateway NestJS self-hosted).
 *
 * Dua jalur:
 * 1. Kirim langsung kalau OPENWA_URL bisa dijangkau dari server (VPS/domain publik).
 * 2. Kalau gateway hanya ada di localhost (kasus Vercel), pesan masuk ke tabel
 *    wa_outbox lalu diambil oleh `npm run wa:agent` di komputer yang menjalankan
 *    OpenWA. Jadi order tidak pernah gagal hanya karena gateway sedang mati.
 *
 * Endpoint: POST {OPENWA_URL}/api/sessions/{id}/messages/send-text
 * Header:   X-API-Key, Idempotency-Key
 * Body:     { chatId, text }
 */
const MAX_LENGTH = 4000;
const baseUrl = () => process.env.OPENWA_URL?.replace(/\/$/, "") ?? "";
const apiKey = () => process.env.OPENWA_KEY ?? "";
const sessionName = () => process.env.OPENWA_SESSION?.trim() || "intorma";

let cachedSession: { id: string; at: number } | null = null;

function isLocalHost(base: string): boolean {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return true;
  }
}

/** Di Vercel, localhost/private IP tidak mungkin dijangkau. Langsung antrekan. */
function canReachDirectly(base: string): boolean {
  if (!base) return false;
  if (process.env.WA_QUEUE_ONLY === "1") return false;
  if (process.env.VERCEL && isLocalHost(base)) return false;
  return true;
}

type Recipient = {
  /** Nomor tanpa tanda +, dipakai untuk tampilan dan fallback chat. */
  number: string;
  /** JID lengkap kalau pengirim memakai LID (WhatsApp baru) atau grup. */
  chatId?: string;
};

function parseRecipient(to: string): Recipient | null {
  const raw = to.trim();
  if (!raw) return null;

  // Terima JID apa adanya, mis. 62812...@c.us atau 2012...@lid.
  if (raw.includes("@")) {
    const chatId = raw.toLowerCase();
    if (!/^[0-9-]+@(c\.us|lid|g\.us|broadcast)$/.test(chatId)) return null;
    const number = chatId.replace(/@.*$/, "").replace(/\D/g, "");
    return number ? { number, chatId } : null;
  }

  const number = normalizeWA(raw);
  return number ? { number } : null;
}

async function resolveSession(base: string, key: string): Promise<string | null> {
  const configured = sessionName();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(configured)) return configured;
  if (cachedSession && Date.now() - cachedSession.at < 5 * 60_000) return cachedSession.id;
  try {
    const res = await fetch(`${base}/api/sessions?name=${encodeURIComponent(configured)}`, {
      headers: { "x-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ id?: string; name?: string }>;
    const match = list.find((s) => s.name === configured);
    if (!match?.id) return null;
    cachedSession = { id: match.id, at: Date.now() };
    return match.id;
  } catch {
    return null;
  }
}

async function sendDirect(
  chatId: string,
  content: string,
  idempotencyKey: string,
  base: string,
  key: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await resolveSession(base, key);
  if (!session) return { ok: false, error: "Sesi WhatsApp belum siap." };
  try {
    const res = await fetch(
      `${base}/api/sessions/${encodeURIComponent(session)}/messages/send-text`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ chatId, text: content.slice(0, MAX_LENGTH) }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}${body ? ` — ${body.slice(0, 160)}` : ""}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "gagal menghubungi gateway" };
  }
}

async function enqueue(
  recipient: Recipient,
  content: string,
  idempotencyKey: string,
): Promise<boolean> {
  try {
    await sql`
      insert into wa_outbox (to_number, chat_id, content, idempotency_key)
      values (${recipient.number}, ${recipient.chatId ?? null}, ${content.slice(0, MAX_LENGTH)}, ${idempotencyKey})
      on conflict (idempotency_key) where idempotency_key is not null do nothing`;
    return true;
  } catch (error) {
    // Database lama mungkin belum punya kolom chat_id. Tetap simpan pesan
    // supaya nomor biasa tidak ikut hilang saat migrasi belum dijalankan.
    if (recipient.chatId) {
      try {
        await sql`
          insert into wa_outbox (to_number, content, idempotency_key)
          values (${recipient.number}, ${content.slice(0, MAX_LENGTH)}, ${idempotencyKey})
          on conflict (idempotency_key) where idempotency_key is not null do nothing`;
        return true;
      } catch (fallbackError) {
        console.error("[wa] gagal menyimpan pesan ke antrean", fallbackError);
        return false;
      }
    }
    console.error("[wa] gagal menyimpan pesan ke antrean", error);
    return false;
  }
}

/**
 * Tidak pernah melempar error: kegagalan WA tidak boleh menggagalkan order.
 * Mengembalikan true kalau pesan terkirim langsung atau berhasil masuk antrean.
 *
 * `to` boleh berupa nomor (0812..., 62812..., +62...) atau JID lengkap
 * (62812...@c.us / 2012...@lid) untuk membalas pesan masuk.
 */
export async function sendWA(
  to: string,
  content: string,
  options: { idempotencyKey?: string } = {},
): Promise<boolean> {
  const recipient = parseRecipient(to);
  if (!recipient) {
    console.warn("[wa] nomor tujuan tidak valid, pesan dilewati");
    return false;
  }
  if (!content.trim()) return false;

  const base = baseUrl();
  const key = apiKey();
  const idempotencyKey = options.idempotencyKey ?? `wa-${crypto.randomUUID()}`;
  const chatId = recipient.chatId ?? `${recipient.number}@c.us`;

  if (key && canReachDirectly(base)) {
    const result = await sendDirect(chatId, content, idempotencyKey, base, key);
    if (result.ok) return true;
    console.warn(`[wa] kirim langsung gagal (${result.error}); pesan masuk antrean`);
  }

  return enqueue(recipient, content, idempotencyKey);
}

export const siteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3001";
};
