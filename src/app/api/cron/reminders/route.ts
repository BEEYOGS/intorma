import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { sendWA, siteUrl } from "@/lib/wa";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const enabled = (await sql`select value from app_settings where key = 'reminder_enabled'`)[0];
  if (String(enabled?.value ?? "0") !== "1") {
    return NextResponse.json({ ok: true, skipped: "reminder disabled" });
  }

  // Pesanan dengan deadline dalam 2 hari atau sudah lewat, belum selesai/batal, dan belum dibayar.
  const rows = await sql`
    select code, name, wa, status, price, paid, deadline, deadline_at
    from orders
    where coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') is not null
      and coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') <= now() + interval '2 days'
      and status not in ('selesai','batal')
      and (price is null or not paid)
    order by coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') asc
    limit 50
  `;

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let skipped = 0;

  for (const r of rows) {
    // Satu pengingat per pesanan per hari. Cron jalan tiap hari, jadi tanpa kunci
    // ini klien akan menerima pesan yang sama sampai pesanan dibayar.
    const key = `reminder-${r.code}-${today}`;
    const seen = await sql`select id from wa_outbox where idempotency_key = ${key} limit 1`;
    if (seen.length) {
      skipped += 1;
      continue;
    }

    const link = `${siteUrl()}/lacak/${r.code}`;
    const msg = [
      `Halo ${r.name}, pengingat untuk pesanan ${r.code}.`,
      r.price ? `Total: ${rupiah(Number(r.price))}` : "Harga menunggu konfirmasi.",
      r.deadline_at
        ? `Target selesai: ${tanggalJam(r.deadline_at)}`
        : r.deadline
          ? `Target selesai: ${tanggal(r.deadline)}`
          : null,
      r.paid ? null : "Pembayaran belum kami terima.",
      `Detail: ${link}`,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await sendWA(String(r.wa ?? ""), msg);
    await sql`
      insert into wa_outbox (to_number, content, status, attempts, last_error, idempotency_key, sent_at)
      values (${String(r.wa ?? "")}, ${msg}, ${ok ? "sent" : "failed"}, 1,
        ${ok ? null : "Gagal mengirim langsung via gateway"}, ${key}, ${ok ? new Date() : null})
      on conflict (idempotency_key) where idempotency_key is not null do nothing`;
    if (ok) sent += 1;
  }

  return NextResponse.json({ ok: true, candidates: rows.length, sent, skipped });
}