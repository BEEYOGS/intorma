import { normalizeWA } from "./format";
import { sql } from "./db";

const MAX_LENGTH = 4000;
const baseUrl = () => process.env.OPENWA_URL?.replace(/\/$/, "") ?? "";
const apiKey = () => process.env.OPENWA_KEY ?? "";
const sessionName = () => process.env.OPENWA_SESSION?.trim() || "intorma";

async function resolveSession(base: string, key: string): Promise<string | null> {
  const configured = sessionName();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(configured)) return configured;
  try {
    const res = await fetch(`${base}/api/sessions?name=${encodeURIComponent(configured)}`, {
      headers: { "x-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ id?: string; name?: string }>;
    return list.find((s) => s.name === configured)?.id ?? null;
  } catch {
    return null;
  }
}

async function sendDirect(chatId: string, content: string, key: string, base: string): Promise<boolean> {
  const session = await resolveSession(base, key);
  if (!session) return false;
  const res = await fetch(`${base}/api/sessions/${encodeURIComponent(session)}/messages/send-text`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ chatId, text: content.slice(0, MAX_LENGTH) }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  return res.ok;
}

async function enqueue(to: string, content: string): Promise<boolean> {
  try {
    const number = normalizeWA(to);
    if (!number) return false;
    await sql`insert into wa_outbox (to_number, content) values (${number}, ${content.slice(0, MAX_LENGTH)})`;
    return true;
  } catch {
    return false;
  }
}

export async function sendWA(to: string, content: string): Promise<boolean> {
  const number = normalizeWA(to);
  if (!number || !content.trim()) return false;
  const base = baseUrl();
  const key = apiKey();
  if (key && base) {
    try {
      const res = await fetch(`${base}/api/sessions?name=${encodeURIComponent(sessionName())}`, {
        headers: { "x-api-key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const sessions = (await res.json()) as Array<{ id: string; name: string }>;
      if (sessions.some((s) => s.name === sessionName())) {
        const sent = await sendDirect(`${number}@c.us`, content, key, base);
        if (sent) return true;
      }
    } catch {}
  }
  return enqueue(to, content);
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3001";
