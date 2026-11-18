import { normalizeWA } from "./format";

/**
 * Kirim pesan lewat server OpenWA (open-wa EASY API) yang jalan terpisah.
 * Tidak pernah melempar error: kegagalan WA tidak boleh menggagalkan order.
 */
export async function sendWA(to: string, content: string): Promise<boolean> {
  const base = process.env.OPENWA_URL;
  const number = normalizeWA(to);
  if (!base || !number) return false;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sendText`, {
      method: "POST",
      headers: { "content-type": "application/json", api_key: process.env.OPENWA_KEY ?? "" },
      body: JSON.stringify({ args: { to: `${number}@c.us`, content } }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return json?.success !== false;
  } catch {
    return false;
  }
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
