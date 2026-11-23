// Pasang trigger pengaman WA untuk order baru.
//
// Pakai: npm run db:wa-trigger
//
// Trigger ini membuat antrean wa_outbox untuk setiap order baru, walaupun
// kode aplikasi yang sedang live tidak memanggil sendWA. Pesan tetap dikirim
// oleh `npm run wa:agent` di komputer yang menjalankan OpenWA.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi di .env.local");
  process.exit(1);
}

function normalizeWA(input) {
  let n = String(input || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return /^62\d{8,13}$/.test(n) ? n : "";
}

const sql = neon(process.env.DATABASE_URL);
const raw = readFileSync(new URL("../db/wa-trigger.sql", import.meta.url), "utf8");
const statements = raw
  .split(/^-- STATEMENT\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) await sql.query(statement);

const admin = normalizeWA(process.env.ADMIN_WA || "");
if (admin) {
  await sql.query(
    `insert into app_settings (key, value) values ('admin_wa', $1)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [admin],
  );
  console.log(`Nomor admin untuk notifikasi: ${admin}`);
} else {
  console.warn("ADMIN_WA kosong/tidak valid. Notifikasi admin tidak akan dibuat.");
}

// Sengaja pakai WA_SITE_URL, bukan NEXT_PUBLIC_SITE_URL: di .env.local nilainya
// localhost dan tidak boleh masuk ke pesan pelanggan production.
const site = (process.env.WA_SITE_URL || "").replace(/\/+$/, "");
if (site) {
  await sql.query(
    `insert into app_settings (key, value) values ('site_url', $1)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [site],
  );
  console.log(`URL situs untuk tautan lacak: ${site}`);
}

console.log(`Selesai: ${statements.length} perintah trigger dijalankan.`);
console.log("Trigger aktif. Pastikan `npm run wa:agent` berjalan.");
