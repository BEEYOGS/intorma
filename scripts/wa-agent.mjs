// Worker WhatsApp untuk in.torma.
//
// Vercel tidak bisa menjangkau OpenWA yang berjalan di localhost. Aplikasi web
// menyimpan notifikasi ke tabel wa_outbox, lalu skrip ini (di komputer yang
// menjalankan OpenWA) mengambilnya lewat /api/wa/outbox di situs publik dan
// mengirimkannya — tanpa butuh DATABASE_URL produksi di mesin ini.
//
// Pakai: npm run wa:agent
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
const secret = env.OPENWA_WEBHOOK_SECRET || "";
const site = (env.OUTBOX_URL || env.SITE_WEBHOOK_URL || env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const pollMs = Math.max(2000, Number(env.WA_POLL_MS || 5000));

if (!key) {
  console.error("[wa-agent] OPENWA_KEY kosong di .env.local");
  process.exit(1);
}
if (!secret) {
  console.error("[wa-agent] OPENWA_WEBHOOK_SECRET kosong di .env.local");
  process.exit(1);
}
if (!site) {
  console.error("[wa-agent] SITE_WEBHOOK_URL kosong. Isi URL publik, mis. https://intorma-psi.vercel.app");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const stamp = () => new Date().toLocaleTimeString("id-ID", { hour12: false });

let stopping = false;
let lastNotice = "";

function notice(message) {
  if (message === lastNotice) return;
  lastNotice = message;
  console.log(`[wa-agent ${stamp()}] ${message}`);
}

async function api(path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": key, ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
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

async function ensureSession() {
  const list = await api(`/api/sessions?name=${encodeURIComponent(sessionName)}`);
  if (!list.ok) throw new Error(`daftar sesi gagal: HTTP ${list.status}`);
  let session = (list.json || []).find((item) => item.name === sessionName) || null;

  if (!session) {
    const created = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name: sessionName }),
    });
    if (!created.ok) throw new Error(`buat sesi gagal: HTTP ${created.status}`);
    session = created.json;
    notice(`sesi "${sessionName}" dibuat. Jalankan npm run wa:session untuk scan QR.`);
  }

  if (!["ready", "qr_ready", "authenticating", "initializing"].includes(String(session.status))) {
    const started = await api(`/api/sessions/${session.id}/start`, { method: "POST" });
    if (!started.ok && started.status !== 400) {
      throw new Error(`start sesi gagal: HTTP ${started.status}`);
    }
    const info = await api(`/api/sessions/${session.id}`);
    session = info.json ?? session;
  }

  return session;
}

async function sendMessage(row, sessionId) {
  const headers = { "content-type": "application/json", "x-api-key": key };
  if (row.idempotency_key) headers["Idempotency-Key"] = row.idempotency_key;

  const chatId = row.chat_id || `${row.to_number}@c.us`;
  const res = await fetch(`${base}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chatId,
      text: String(row.content).slice(0, 4000),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => "");
  return { ok: false, error: `HTTP ${res.status}${body ? ` — ${body.slice(0, 180)}` : ""}` };
}

async function report(row, result) {
  const res = await fetch(`${site}/api/wa/outbox?s=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: Number(row.id), ok: result.ok, error: result.error || undefined }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => null);
  return { httpOk: res.ok, json };
}

async function tick() {
  const session = await ensureSession();
  if (!session?.id || session.status !== "ready") {
    notice(`sesi WhatsApp belum ready (${session?.status || "?"}). Menunggu scan/verifikasi.`);
    return;
  }

  const res = await fetch(`${site}/api/wa/outbox?s=${encodeURIComponent(secret)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`ambil antrean gagal: HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => null);
  const rows = (data?.rows || []).filter((row) => Number.isInteger(Number(row.id)));

  if (!rows.length) {
    notice("terhubung. Menunggu pesan baru.");
    return;
  }

  for (const row of rows) {
    if (stopping) return;
    const result = await sendMessage(row, session.id);
    const state = await report(row, result);
    if (result.ok) {
      console.log(`[wa-agent ${stamp()}] terkirim #${row.id} → ${row.chat_id || row.to_number}`);
    } else {
      const json = state.json || {};
      console.warn(
        `[wa-agent ${stamp()}] gagal #${row.id} (${json.attempts ?? "?"}/8): ${result.error}` +
          (json.final ? " — ditandai failed" : ` — coba lagi dalam ${json.delaySeconds ?? "?"}s`),
      );
    }
  }
}

console.log(`[wa-agent] OpenWA: ${base}`);
console.log(`[wa-agent] Sesi: ${sessionName} · antrean: ${site} · cek tiap ${pollMs / 1000}s`);

process.on("SIGINT", () => {
  stopping = true;
  console.log("\n[wa-agent] berhenti.");
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopping = true;
  process.exit(0);
});

while (!stopping) {
  try {
    await tick();
  } catch (error) {
    console.error(`[wa-agent ${stamp()}] ${error instanceof Error ? error.message : error}`);
  }
  await sleep(pollMs);
}
