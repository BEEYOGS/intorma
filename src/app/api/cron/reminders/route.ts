import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeWA, rupiah, tanggal, tanggalHariIni, tanggalJam } from "@/lib/format";
import { planReminder } from "@/lib/reminders";
import { getPaymentSettings, paymentLines } from "@/lib/settings";
import { adminWhatsApp, sendWA, siteUrl } from "@/lib/wa";

export const runtime = "nodejs";
export const maxDuration = 60;

type Candidate = {
  id: number;
  code: string;
  name: string;
  wa: string;
  status: string;
  price: number | null;
  paid: boolean;
  deadline: string | Date | null;
  deadline_at: string | Date | null;
  age_days: number;
};

type Digest = {
  baru: number;
  konfirmasi: number;
  deadline: number;
  belum_bayar: number;
  piutang: number;
};

function recordMessage(to: string, content: string, key: string, ok: boolean) {
  return sql`
    insert into wa_outbox (to_number, content, status, attempts, last_error, idempotency_key, sent_at)
    values (${to}, ${content}, ${ok ? "sent" : "failed"}, 1,
      ${ok ? null : "Gagal mengirim langsung via gateway"}, ${key}, ${ok ? new Date() : null})
    on conflict (idempotency_key) where idempotency_key is not null do nothing`;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi." }, { status: 503 });
  }
  if (secret) {
    const auth = Buffer.from(req.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const today = tanggalHariIni();
  const payment = await getPaymentSettings();
  const payLines = paymentLines(payment);

  const reminderRow = (await sql`select value from app_settings where key = 'reminder_enabled'`)[0];
  const remindersEnabled = String(reminderRow?.value ?? "0") === "1";

  let candidates = 0;
  let sent = 0;
  let skipped = 0;

  if (remindersEnabled) {
    // Kandidat: deadline dalam 2 hari/lewat, atau belum dibayar sejak 2 hari lalu.
    const rows = (await sql`
      select id, code, name, wa, status, price, paid, deadline, deadline_at,
        greatest(0, floor(extract(epoch from (now() - created_at)) / 86400))::int as age_days
      from orders
      where status <> 'batal'
        and (
          coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta')
            <= now() + interval '2 days'
          or (price is not null and not paid and created_at <= now() - interval '2 days')
        )
      order by coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') asc nulls last,
        created_at asc
      limit 40
    `) as Candidate[];

    candidates = rows.length;

    for (const r of rows) {
      const deadlineAt = r.deadline_at ?? r.deadline ?? null;
      const price = r.price == null ? null : Number(r.price);
      const plan = planReminder(
        {
          code: r.code,
          status: r.status,
          price,
          paid: Boolean(r.paid),
          deadlineAt,
          ageDays: Number(r.age_days ?? 0),
        },
        today,
      );
      if (!plan) {
        skipped += 1;
        continue;
      }

      // Satu pesan per pesanan per hari untuk deadline; tagihan hanya di hari
      // ke-2/7/14. Kunci idempoten mencegah kiriman ganda saat cron diulang.
      const seen = await sql`select id from wa_outbox where idempotency_key = ${plan.key} limit 1`;
      if (seen.length) {
        skipped += 1;
        continue;
      }

      const paymentBlock =
        !r.paid && price !== null && payLines.length ? payLines.join("\n") : null;
      const lines =
        plan.kind === "deadline"
          ? [
              `Halo ${r.name}, pengingat untuk pesanan ${r.code}.`,
              price !== null ? `Total: ${rupiah(price)}` : "Harga menunggu konfirmasi.",
              deadlineAt ? `Target selesai: ${tanggalJam(deadlineAt)}` : null,
              r.paid ? "Pembayaran: lunas." : "Pembayaran belum kami terima.",
              paymentBlock,
              `Detail & bayar: ${siteUrl()}/lacak/${r.code}`,
            ]
          : [
              `Halo ${r.name}, pesanan ${r.code} masih menunggu pembayaran.`,
              `Total: ${rupiah(price)}`,
              `Sudah ${Number(r.age_days ?? 0)} hari sejak pesanan dibuat.`,
              deadlineAt ? `Target selesai: ${tanggalJam(deadlineAt)}` : null,
              paymentBlock,
              `Bayar online / lihat detail: ${siteUrl()}/lacak/${r.code}`,
            ];

      const message = lines.filter((line): line is string => Boolean(line)).join("\n");
      const to = normalizeWA(String(r.wa ?? "")) || String(r.wa ?? "");
      // Kunci idempoten ikut ke antrean supaya agent tidak mengirim ulang
      // pesan yang sudah dicatat gagal oleh cron.
      const ok = await sendWA(to, message, plan.key);
      await recordMessage(to, message, plan.key, ok);
      if (ok) sent += 1;
    }
  }

  // Rangkuman admin sekali sehari. Tetap jalan walau pengingat klien dimatikan.
  let digest: "sent" | "skipped" | "disabled" | "empty" = "skipped";
  const digestRow = (await sql`select value from app_settings where key = 'admin_digest_enabled'`)[0];
  const digestEnabled = String(digestRow?.value ?? "1") !== "0";
  const admin = adminWhatsApp();

  if (!digestEnabled) {
    digest = "disabled";
  } else if (!admin) {
    digest = "skipped";
  } else {
    const key = `admin-digest-${today}`;
    const seen = await sql`select id from wa_outbox where idempotency_key = ${key} limit 1`;
    if (seen.length) {
      digest = "skipped";
    } else {
      const row = (await sql`
        select
          (select count(*)::int from orders where created_at >= now() - interval '24 hours') as baru,
          (select count(*)::int from orders where status = 'menunggu') as konfirmasi,
          (select count(*)::int from orders
            where status not in ('selesai', 'batal')
              and coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta')
                <= now() + interval '48 hours') as deadline,
          (select count(*)::int from orders
            where price is not null and not paid and status <> 'batal') as belum_bayar,
          (select coalesce(sum(price), 0)::int from orders
            where price is not null and not paid and status <> 'batal') as piutang
      `)[0] as Digest;

      // Kirim hanya kalau ada pekerjaan baru/urgent, supaya tidak jadi spam
      // harian ketika yang tersisa cuma piutang lama.
      if (Number(row.baru) + Number(row.konfirmasi) + Number(row.deadline) === 0) {
        digest = "empty";
      } else {
        const message = [
          `Rangkuman in.torma — ${tanggal(new Date())}`,
          `Pesanan baru (24 jam): ${Number(row.baru)}`,
          `Menunggu konfirmasi: ${Number(row.konfirmasi)}`,
          `Deadline ≤48 jam: ${Number(row.deadline)}`,
          `Belum dibayar: ${Number(row.belum_bayar)} · ${rupiah(Number(row.piutang))}`,
          "",
          `Buka admin: ${siteUrl()}/admin`,
        ].join("\n");
        const ok = await sendWA(admin, message);
        await recordMessage(admin, message, key, ok);
        digest = ok ? "sent" : "skipped";
      }
    }
  }

  return NextResponse.json({
    ok: true,
    remindersEnabled,
    candidates,
    sent,
    skipped,
    digest,
  });
}
