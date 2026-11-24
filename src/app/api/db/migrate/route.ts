import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Migrasi satu-kali dari sisi server: DATABASE_URL produksi tidak bisa
// dibaca lewat API Vercel, jadi skrip lokal tidak punya akses. Route ini
// hanya dipakai sesaat (dihapus setelah migrasi berjalan).
export async function POST(req: Request) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secret || new URL(req.url).searchParams.get("s") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const statements = readFileSync(`${process.cwd()}/db/schema.sql`, "utf8")
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: Array<{ ok: boolean; error?: string }> = [];
  for (const statement of statements) {
    try {
      await sql.query(statement);
      results.push({ ok: true });
    } catch (error) {
      results.push({ ok: false, error: String(error).slice(0, 200) });
    }
  }

  const tables: Array<{ name: string }> = [];
  try {
    const rows = await sql.query(
      `select table_name as name from information_schema.tables
       where table_schema = 'public' and table_name in ('wa_outbox', 'order_files')
       order by table_name`,
    );
    for (const row of rows) tables.push({ name: String(row.name) });
  } catch {
    /* pemeriksaan gagal, biarkan kosong */
  }

  return NextResponse.json({ ok: results.every((r) => r.ok), count: statements.length, results, tables });
}
