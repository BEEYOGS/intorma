// Diagnosa cepat WhatsApp: gateway, sesi, webhook, dan antrean.
// Pakai: npm run wa:check
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvFile(join(root, ".env.local")), ...process.env };
const base = (env.OPENWA_URL || "http://127.0.0.1:2785").replace(/\/$/, "");
const key = env.OPENWA_KEY || "";
const sessionName = env.OPENWA_SESSION || "intorma";
const site = (env.WA_SITE_URL || env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

const ok = (value) => (value ? "OK" : "BELUM");
const line = "-".repeat(66);

console.log(line);
console.log("  Diagnosa WhatsApp in.torma");
console.log(line);
const provider = String(
  env.WA_PROVIDER || (env.FONNTE_TOKEN ? "fonnte" : env.META_WA_TOKEN ? "cloud" : "openwa"),
).trim();
console.log(`  Provider     : ${provider}`);
console.log(`  Situs publik : ${site || "(belum diisi)"}`);
if (provider === "cloud") {
  const ready = ["META_WA_TOKEN", "META_WA_PHONE_ID", "META_WA_APP_SECRET", "META_WA_VERIFY_TOKEN"]
    .map((key) => `${key}=${ok(env[key])}`)
    .join(" · ");
  console.log(`  Meta env     : ${ready}`);
  console.log("  Gateway lokal tidak diperlukan saat WA_PROVIDER=cloud.");
  console.log(line);
} else if (provider === "fonnte") {
  console.log(`  Token Fonnte : ${ok(env.FONNTE_TOKEN)}`);
  console.log("  Webhook      : /api/wa/webhook/<secret> (secret tidak ditampilkan di sini)");
  try {
    const res = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: { Authorization: String(env.FONNTE_TOKEN || "") },
      signal: AbortSignal.timeout(5000),
    });
    const device = await res.json().catch(() => null);
    console.log(`  Device       : ${ok(device?.status === true)} (HTTP ${res.status})`);
    if (device?.device) console.log(`  Nomor        : ${device.device}`);
    if (device?.device_status) console.log(`  Status       : ${device.device_status}`);
    if (device?.quota) console.log(`  Kuota        : ${device.quota}`);
    if (device?.expired) console.log(`  Expired      : ${device.expired}`);
    if (device?.reason) console.log(`  Alasan       : ${device.reason}`);
  } catch (error) {
    console.log(`  Device       : gagal dicek (${error instanceof Error ? error.message : error})`);
  }
  console.log(line);
} else {
  console.log(`  OpenWA URL   : ${base}`);
  console.log(`  Sesi         : ${sessionName}`);
  console.log(`  API key      : ${key ? "terisi" : "KOSONG"}`);
  console.log(line);

  try {
    const health = await fetch(`${base}/api/health/ready`, { signal: AbortSignal.timeout(4000) });
    console.log(`  Gateway      : ${ok(health.ok)} (HTTP ${health.status})`);
  } catch {
    console.log("  Gateway      : MATI — jalankan OpenWA (npm run openwa)");
  }

  if (key) {
    try {
      const res = await fetch(`${base}/api/sessions?name=${encodeURIComponent(sessionName)}`, {
        headers: { "x-api-key": key },
        signal: AbortSignal.timeout(5000),
      });
      const list = await res.json().catch(() => []);
      const session = (Array.isArray(list) ? list : []).find((item) => item.name === sessionName);
      if (!session) {
        console.log("  Sesi WA      : belum ada — jalankan npm run wa:session");
      } else {
        console.log(`  Sesi WA      : ${String(session.status || "?").toUpperCase()} · ${session.phone || "belum tertaut"}`);
        if (session.status === "ready") {
          const hooks = await fetch(`${base}/api/sessions/${session.id}/webhooks`, {
            headers: { "x-api-key": key },
            signal: AbortSignal.timeout(5000),
          })
            .then((r) => r.json())
            .catch(() => []);
          const hook = (Array.isArray(hooks) ? hooks : []).find((item) => String(item.url).includes("/api/wa/webhook"));
          console.log(`  Webhook      : ${hook ? hook.url : "belum terdaftar — jalankan npm run wa:webhook"}`);
        }
      }
    } catch (error) {
      console.log(`  Sesi WA      : gagal dicek (${error instanceof Error ? error.message : error})`);
    }
  }
}

if (env.DATABASE_URL) {
  try {
    const sql = neon(env.DATABASE_URL);
    const rows = await sql.query(
      `select status, count(*)::int as n from wa_outbox group by status order by status`,
    );
    const summary = rows.map((row) => `${row.status}=${row.n}`).join(" · ") || "kosong";
    console.log(`  Antrean      : ${summary}`);
    const failed = await sql.query(
      `select id, to_number, last_error from wa_outbox where status = 'failed' order by id desc limit 3`,
    );
    for (const row of failed) {
      console.log(`    #${row.id} → ${row.to_number}: ${String(row.last_error || "").slice(0, 100)}`);
    }
  } catch (error) {
    console.log(`  Antrean      : gagal dibaca (${error instanceof Error ? error.message : error})`);
  }
} else {
  console.log("  Antrean      : DATABASE_URL kosong");
}

console.log(line);
console.log("  Link chat publik tidak butuh gateway; tombol wa.me tetap jalan.");
if (provider === "fonnte") {
  console.log("  Untuk notifikasi: isi token di Fonnte, set webhook rahasia, lalu deploy.");
} else if (provider === "cloud") {
  console.log("  Untuk notifikasi: Cloud API mengirim langsung dari Vercel.");
} else {
  console.log("  Untuk notifikasi: npm run openwa → npm run wa:agent");
}
console.log(line);
