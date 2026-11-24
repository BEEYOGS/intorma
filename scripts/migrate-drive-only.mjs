import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi di .env.local");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const statements = readFileSync(new URL("../db/migrations/2026-11-24-drive-only.sql", import.meta.url), "utf8")
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const s of statements) await sql.query(s);
console.log(`Selesai: ${statements.length} perintah dijalankan.`);

// Drop kolom tidak otomatis mengembalikan ruang sampai tabel di-rewrite.
await sql.query("vacuum full uploads");
console.log(
  await sql.query(
    "select pg_size_pretty(pg_total_relation_size('uploads')) as uploads, " +
      "pg_size_pretty(pg_database_size(current_database())) as database",
  ),
);
