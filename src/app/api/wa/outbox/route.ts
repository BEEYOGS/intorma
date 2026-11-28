import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Jembatan antrean WhatsApp untuk wa-agent (scripts/wa-agent.mjs).
 *
 * Agent berjalan di komputer yang menjalankan OpenWA, tapi tidak punya
 * DATABASE_URL produksi. Ia mengambil pesan tertunda lewat GET dan
 * melaporkan hasil kirim lewat POST — dua-duanya ke situs publik ini.
 */
function authorized(req: Request): boolean {
  const expected = process.env.OPENWA_WEBHOOK_SECRET;
  const given = new URL(req.url).searchParams.get("s") ?? "";
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const limited = await guardRate("wa_outbox_read", 120);
  if (limited) return limited;
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const rows = await sql.query(
      `select id, to_number, chat_id, content, idempotency_key
       from wa_outbox
       where status = 'pending' and next_attempt_at <= now()
       order by id
       limit 10`,
    );
    return NextResponse.json(
      { ok: true, rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[wa/outbox] gagal membaca antrean", error);
    return NextResponse.json({ ok: false, error: "antrean tidak tersedia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = await guardRate("wa_outbox_write", 120);
  if (limited) return limited;
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: number; ok?: boolean; error?: string } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "id tidak valid" }, { status: 400 });
  }

  if (body?.ok) {
    await sql.query(
      `update wa_outbox
       set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
       where id = $1`,
      [id],
    );
    return NextResponse.json({ ok: true });
  }

  const current = await sql.query(`select attempts from wa_outbox where id = $1`, [id]);
  const attempts = Number(current[0]?.attempts ?? 0) + 1;
  const final = attempts >= 8;
  const delaySeconds = Math.min(1800, 30 * 2 ** (attempts - 1));
  await sql.query(
    `update wa_outbox
     set status = $2, attempts = $3, last_error = $4,
         next_attempt_at = now() + make_interval(secs => $5)
     where id = $1`,
    [id, final ? "failed" : "pending", attempts, String(body?.error ?? "").slice(0, 500), delaySeconds],
  );
  return NextResponse.json({ ok: true, final, attempts, delaySeconds });
}
