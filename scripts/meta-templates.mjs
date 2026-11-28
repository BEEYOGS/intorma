// Buat/enam template WhatsApp Cloud yang dipakai aplikasi.
// Isi META_WA_TOKEN + META_WA_PHONE_ID di .env.local, lalu: npm run wa:cloud:templates
// Script hanya mencetak nama dan status; token tidak pernah ditampilkan.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const token = String(env.META_WA_TOKEN || "").trim();
const phoneId = String(env.META_WA_PHONE_ID || "").trim();
const version = String(env.META_WA_VERSION || "v25.0").trim();
const language = String(env.META_TPL_LANGUAGE || "id").trim();

const missing = [];
if (!token) missing.push("META_WA_TOKEN");
if (!phoneId) missing.push("META_WA_PHONE_ID");
if (missing.length) {
  console.error(`Isi dulu di .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const templates = [
  {
    kind: "ORDER",
    name: env.META_TPL_ORDER || "order_created",
    category: "UTILITY",
    body: "Halo {{1}}, pesanan {{2}} sudah kami terima. {{3}} Total: {{4}} Target selesai: {{5}} Pantau & bayar: {{6}}",
  },
  {
    kind: "ADMIN",
    name: env.META_TPL_ADMIN || "admin_notice",
    category: "UTILITY",
    body: "Notifikasi in.torma — {{1}}: {{2}}",
  },
  {
    kind: "STATUS",
    name: env.META_TPL_STATUS || "order_status",
    category: "UTILITY",
    body: "Halo {{1}}, pesanan {{2}}: {{3}} Pantau di: {{4}}",
  },
  {
    kind: "PAYMENT",
    name: env.META_TPL_PAYMENT || "payment_received",
    category: "UTILITY",
    body: "Halo {{1}}, pembayaran {{2}} sebesar {{3}} sudah kami terima. Terima kasih! Pantau: {{4}}",
  },
  {
    kind: "REMINDER",
    name: env.META_TPL_REMINDER || "payment_reminder",
    category: "UTILITY",
    body: "Halo {{1}}, pesanan {{2}} masih menunggu pembayaran. Total: {{3}} Target selesai: {{4}} Bayar & detail: {{5}}",
  },
  {
    kind: "REORDER",
    name: env.META_TPL_REORDER || "reorder_offer",
    category: "MARKETING",
    body: "Halo {{1}}, pesanan {{2}} sudah selesai. Butuh cetak ulang? Pakai {{3}} untuk diskon. Pesan lagi: {{4}}",
  },
];

const base = `https://graph.facebook.com/${version}/${phoneId}/message_templates`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function graph(url, options = {}) {
  const response = await fetch(url, { ...options, headers, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    const message = json.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return json;
}

async function existing() {
  const url = `${base}?fields=id,name,status,category&limit=100`;
  const rows = [];
  let after = null;
  do {
    const page = await graph(`${url}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    rows.push(...(page.data || []));
    after = page.paging?.cursors?.after || null;
  } while (after);
  return new Map(rows.map((row) => [row.name, row]));
}

const current = await existing();
let created = 0;
let skipped = 0;

for (const item of templates) {
  const found = current.get(item.name);
  if (found) {
    console.log(`${item.name}: sudah ada (${found.status || "status tidak terbaca"})`);
    skipped += 1;
    continue;
  }
  try {
    const result = await graph(base, {
      method: "POST",
      body: JSON.stringify({
        name: item.name,
        language,
        category: item.category,
        components: [{ type: "BODY", text: item.body }],
      }),
    });
    console.log(`${item.name}: dibuat (${result.status || "menunggu review"})`);
    created += 1;
  } catch (error) {
    console.error(`${item.name}: gagal — ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\nSelesai: ${created} dibuat, ${skipped} sudah ada. Template baru tetap perlu disetujui Meta.`);
