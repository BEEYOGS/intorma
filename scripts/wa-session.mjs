// Buat/start sesi WhatsApp di OpenWA gateway lalu simpan QR sebagai PNG.
//
// Pakai: npm run wa:session   (butuh OpenWA jalan: npm run openwa)
//
// Output: .tools/qr-<nama>.png  → buka file itu, scan pakai WhatsApp >
// Perangkat tertaut. Setelah scan, skrip menunggu sampai status "ready".
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvFile(join(root, ".env.local")), ...process.env };
const base = (env.OPENWA_URL || "http://127.0.0.1:2785").replace(/\/$/, "");
const key = env.OPENWA_KEY || "";
const wanted = env.OPENWA_SESSION || "intorma";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!key) {
  console.error("OPENWA_KEY kosong di .env.local");
  process.exit(1);
}

async function api(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": key, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  return { ok: res.ok, status: res.status, json, text };
}

let session = null;

for (let attempt = 0; attempt < 60 && !session; attempt++) {
  const list = await api("/api/sessions").catch(() => null);
  if (!list?.ok) {
    if (attempt === 0) console.log(`[wa] menunggu OpenWA di ${base} ...`);
    await sleep(2000);
    continue;
  }
  session = (list.json || []).find((s) => s.name === wanted) ?? null;
}

if (!session) {
  console.log(`[wa] membuat sesi "${wanted}" ...`);
  const created = await api("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ name: wanted }),
  });
  if (!created.ok) {
    console.error(`[wa] gagal membuat sesi: HTTP ${created.status} ${created.text.slice(0, 300)}`);
    process.exit(1);
  }
  session = created.json;
  console.log(`[wa] sesi dibuat: ${session.id}`);
} else {
  console.log(`[wa] sesi "${wanted}" sudah ada: ${session.id} (status ${session.status})`);
}

if (session.status !== "ready") {
  const started = await api(`/api/sessions/${session.id}/start`, { method: "POST" });
  if (!started.ok && started.status !== 400) {
    console.error(`[wa] gagal start: HTTP ${started.status} ${started.text.slice(0, 300)}`);
    process.exit(1);
  }
}

mkdirSync(join(root, ".tools"), { recursive: true });
const qrFile = join(root, ".tools", `qr-${wanted}.png`);

let lastQr = "";
for (let i = 0; i < 150; i++) {
  const info = await api(`/api/sessions/${session.id}`);
  const status = info.json?.status;
  if (status === "ready") {
    console.log(`[wa] sesi siap. Nomor: ${info.json?.phone ?? "?"}`);
    process.exit(0);
  }
  if (status === "failed" || status === "action_required") {
    console.error(`[wa] sesi ${status}: ${info.json?.lastError ?? "-"}`);
    process.exit(1);
  }
  if (status === "qr_ready" || status === "authenticating") {
    const qr = await api(`/api/sessions/${session.id}/qr`);
    const dataUrl = qr.json?.qrCode;
    if (qr.ok && dataUrl && dataUrl !== lastQr) {
      lastQr = dataUrl;
      const b64 = String(dataUrl).replace(/^data:image\/\w+;base64,/, "");
      writeFileSync(qrFile, Buffer.from(b64, "base64"));
      console.log(`[wa] QR baru disimpan: ${qrFile}`);
      console.log("[wa] buka file itu lalu scan: WhatsApp > Perangkat tertaut");
    }
  }
  await sleep(2000);
}

console.error("[wa] waktu habis menunggu QR/ready.");
process.exit(1);
