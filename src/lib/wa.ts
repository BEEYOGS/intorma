import { normalizeWA } from "./format";

/**
 * Kirim pesan lewat OpenWA gateway (NestJS, self-hosted) yang jalan terpisah.
 * Tidak pernah melempar error: kegagalan WA tidak boleh menggagalkan order.
 *
 * Endpoint: POST {OPENWA_URL}/api/sessions/{id}/messages/send-text
 * Header:   X-API-Key
 * Body:     { chatId, text }
 *
 * OPENWA_SESSION boleh berupa id (uuid) atau nama sesi; nama dicari sekali
 * lalu di-cache 5 menit supaya tidak query daftar sesi tiap kirim pesan.
 */
const baseUrl = () => process.env.OPENWA_URL?.replace(/\/$/, "") ?? "";
const apiKey = () => process.env.OPENWA_KEY ?? "";

let cachedSession: { id: string; at: number } | null = null;

async function resolveSession(base: string, key: string): Promise<string | null> {
  const configured = process.env.OPENWA_SESSION?.trim();
  if (!configured) return null;
  // uuid langsung dipakai apa adanya
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(configured)) return configured;
  if (cachedSession && Date.now() - cachedSession.at < 5 * 60_000) return cachedSession.id;
  try {
    const res = await fetch(`${base}/api/sessions`, {
      headers: { "x-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
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

export async function sendWA(to: string, content: string): Promise<boolean> {
  const base = baseUrl();
  const key = apiKey();
  const number = normalizeWA(to);
  if (!base || !key || !number) return false;
  try {
    const session = await resolveSession(base, key);
    if (!session) return false;
    const res = await fetch(
      `${base}/api/sessions/${encodeURIComponent(session)}/messages/send-text`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key },
        body: JSON.stringify({ chatId: `${number}@c.us`, text: content }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
