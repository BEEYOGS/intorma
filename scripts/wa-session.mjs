// Buat/start sesi WhatsApp di OpenWA gateway lalu simpan QR sebagai PNG.
//
// Pakai: npm run wa:session   (butuh OpenWA jalan: npm run openwa)
//
// Output: .tools/qr-<nama>.png  → buka file itu, scan pakai WhatsApp >
// Perangkat tertaut. Setelah scan, skrip menunggu sampai status "ready".
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
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
const viewerFile = join(root, ".tools", `qr-${wanted}.html`);

// Halaman kecil yang memuat ulang QR tiap 2 detik, jadi QR yang dipindai selalu
// yang terbaru. Buka file ini di browser (bukan PNG-nya) untuk menautkan.
writeFileSync(
  viewerFile,
  `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Scan WhatsApp — ${wanted}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; gap: 18px;
    background: #06080c; color: #e9eff7; font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
  .card { background: #fff; padding: 16px; border-radius: 16px; }
  img { display: block; width: min(78vw, 320px); height: auto; }
  h1 { font-size: 18px; margin: 0; }
  p { color: #8e9cb0; font-size: 13px; line-height: 1.5; margin: 0; max-width: 36ch; }
  .ok { color: #3ce0c4; }
</style>
</head>
<body>
  <div>
    <h1>Scan untuk menautkan WhatsApp</h1>
    <p style="margin:10px auto 18px">WhatsApp &rarr; Perangkat tertaut &rarr; Tautkan perangkat. Halaman ini memperbarui QR otomatis.</p>
    <div class="card"><img id="qr" alt="QR WhatsApp" src="qr-${wanted}.png" /></div>
    <p id="hint" style="margin-top:16px">Menunggu QR&hellip;</p>
  </div>
  <script>
    const img = document.getElementById("qr");
    const hint = document.getElementById("hint");
    let fails = 0;
    setInterval(() => {
      img.src = "qr-${wanted}.png?t=" + Date.now();
      img.onload = () => { fails = 0; hint.textContent = "QR diperbarui otomatis."; };
      img.onerror = () => { fails++; if (fails > 3) hint.textContent = "Menunggu QR dari gateway\\u2026"; };
    }, 2000);
  </script>
</body>
</html>
`,
);

const canAutoOpen = process.stdout.isTTY && process.platform === "win32" && env.WA_OPEN_QR !== "0";
let openedViewer = false;

let lastQr = "";
for (let i = 0; i < 1800; i++) {
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
      console.log(`[wa] buka viewer (auto-refresh): ${viewerFile}`);
      console.log("[wa] WhatsApp > Perangkat tertaut > Tautkan perangkat");
      if (canAutoOpen && !openedViewer) {
        openedViewer = true;
        spawn("cmd.exe", ["/c", "start", "", viewerFile], { detached: true, stdio: "ignore" }).unref();
      }
    }
  }
  await sleep(2000);
}

console.error("[wa] waktu habis menunggu QR/ready.");
process.exit(1);
