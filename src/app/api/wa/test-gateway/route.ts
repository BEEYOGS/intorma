import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { isAdmin } from "@/lib/auth";
import { adminWhatsApp, waDiagnostics, waSendTest } from "@/lib/wa";

export const runtime = "nodejs";
export const maxDuration = 30;

async function authorized(req: Request): Promise<boolean> {
  if (await isAdmin()) return true;
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const supplied = req.headers.get("x-admin-secret") ?? "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const limited = await guardRate("wa_test_gateway_read", 20);
  if (limited) return limited;
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Butuh login admin atau header x-admin-secret." }, { status: 401 });
  }
  const diagnostics = await waDiagnostics();
  return NextResponse.json({
    ok:
      diagnostics.configured &&
      diagnostics.gatewayReachable &&
      diagnostics.sessionStatus === "ready",
    ...diagnostics,
  });
}

export async function POST(req: Request) {
  const limited = await guardRate("wa_test_gateway_send", 3);
  if (limited) return limited;
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Butuh login admin atau header x-admin-secret." }, { status: 401 });
  }

  let body: { phone?: unknown; message?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* body opsional */
  }
  const phone =
    typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : adminWhatsApp();
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : `Tes koneksi WhatsApp in.torma — ${new Date().toLocaleString("id-ID")}`;

  if (!phone) {
    return NextResponse.json(
      { error: "Isi phone atau ADMIN_WHATSAPP_NUMBER di environment." },
      { status: 400 },
    );
  }

  const result = await waSendTest(phone, message);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
