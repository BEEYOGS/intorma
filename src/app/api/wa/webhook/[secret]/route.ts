import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { GET as baseGet, POST as basePost } from "../route";

export async function GET(req: Request) {
  const limited = await guardRate("wa_webhook_path_get", 30);
  if (limited) return limited;
  return baseGet(req);
}

const SITE = "https://intorma-psi.vercel.app";

function webhookSecret(): string {
  return (process.env.WA_WEBHOOK_SECRET || process.env.OPENWA_WEBHOOK_SECRET || "").trim();
}

function secretValid(given: string, expected: string): boolean {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Fonnte tidak bisa mengirim header kustom. Secret webhook tetap tidak boleh
 * memakai query string, jadi ia diverifikasi lewat segmen path lalu diteruskan
 * ke handler utama sebagai header internal. Handler utama tetap fail-closed.
 */
export async function POST(req: Request, context: { params: Promise<{ secret: string }> }) {
  const limited = await guardRate("wa_webhook_path", 60);
  if (limited) return limited;

  const expected = webhookSecret();
  const { secret } = await context.params;
  if (!secretValid(secret, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const headers = new Headers(req.headers);
  headers.set("x-webhook-secret", expected);
  const body = await req.text().catch(() => "");
  const internal = new Request(`${SITE}/api/wa/webhook`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  return basePost(internal);
}
