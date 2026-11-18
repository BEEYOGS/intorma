// Gateway lokal untuk in.tarma:
//   1. membuka tunnel publik (cloudflared quick tunnel) ke app Next.js
//   2. menjalankan Next.js (kalau belum jalan)
//   3. memastikan OpenWA gateway jalan, sesi WhatsApp aktif, dan webhook
//      sesi itu menunjuk ke /api/wa/webhook lewat URL tunnel
//
// Pakai: npm run gateway   (APP_PORT=3001 secara default)
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, chmodSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

// --- env ------------------------------------------------------------------
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
const fileEnv = loadEnvFile(join(root, ".env.local"));
const env = { ...fileEnv, ...process.env };

const appPort = Number(env.APP_PORT || 3001);
const openwaUrl = (env.OPENWA_URL || "http://127.0.0.1:2785").replace(/\/$/, "");
const openwaKey = env.OPENWA_KEY || "";
const sessionName = env.OPENWA_SESSION || "intorma";
const secret = env.OPENWA_WEBHOOK_SECRET || "";
const localApp = `http://127.0.0.1:${appPort}`;

if (!secret) {
  console.error("OPENWA_WEBHOOK_SECRET kosong di .env.local. Isi dulu.");
  process.exit(1);
}
if (!openwaKey) {
  console.error("OPENWA_KEY kosong di .env.local. Isi dulu.");
  process.exit(1);
}

// --- helpers --------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = [];

function run(name, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { ...opts, env: { ...env, ...(opts.env || {}) } });
  children.push(child);
  return child;
}

function prefix(stream, tag, out = process.stdout) {
  let buf = "";
  stream.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) out.write(`${tag} ${line}\n`);
  });
}

async function reachable(url, timeoutMs = 1500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function openwaApi(path, init = {}) {
  const res = await fetch(`${openwaUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": openwaKey, ...(init.headers || {}) },
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

async function ensureCloudflared() {
  const dir = join(root, ".tools");
  const bin = join(dir, isWin ? "cloudflared.exe" : "cloudflared");
  if (existsSync(bin)) return bin;
  mkdirSync(dir, { recursive: true });
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const asset = isWin
    ? `cloudflared-windows-${arch}.exe`
    : process.platform === "darwin"
      ? "cloudflared-darwin-amd64.tgz"
      : "cloudflared-linux-amd64";
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`;
  console.log(`[gateway] mengunduh ${asset} ...`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`gagal mengunduh cloudflared: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(bin));
  if (!isWin) chmodSync(bin, 0o755);
  console.log("[gateway] cloudflared siap.");
  return bin;
}

function startTunnel(bin) {
  return new Promise((resolveUrl, reject) => {
    const child = run("tunnel", bin, ["tunnel", "--url", localApp, "--no-autoupdate"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let found = false;
    const onLine = (line) => {
      const m = line.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/);
      if (m && !found) {
        found = true;
        resolveUrl(m[0]);
      }
    };
    for (const s of [child.stdout, child.stderr]) {
      let buf = "";
      s.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() ?? "";
        for (const line of lines) {
          onLine(line);
          if (process.env.GATEWAY_VERBOSE === "1") console.log(`[tunnel] ${line}`);
        }
      });
    }
    child.on("exit", (code) => {
      if (!found) reject(new Error(`cloudflared berhenti (exit ${code})`));
    });
    setTimeout(() => {
      if (!found) reject(new Error("tidak dapat URL tunnel dari cloudflared dalam 30 detik"));
    }, 30000);
  });
}

function shutdown(code = 0) {
  for (const c of children) {
    if (c.exitCode !== null || c.pid == null) continue;
    if (isWin) spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function ensureOpenwa() {
  if (await reachable(`${openwaUrl}/api/health/ready`)) return;
  console.log("[gateway] menjalankan OpenWA gateway ...");
  const child = run("openwa", process.execPath, [join(root, "scripts", "openwa.mjs")], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  prefix(child.stdout, "[openwa]");
  prefix(child.stderr, "[openwa]");
  for (let i = 0; i < 120; i++) {
    if (await reachable(`${openwaUrl}/api/health/ready`)) return;
    await sleep(1000);
  }
  throw new Error(`OpenWA tidak siap di ${openwaUrl}`);
}

async function ensureSession() {
  const list = await openwaApi("/api/sessions");
  if (!list.ok) throw new Error(`daftar sesi gagal: HTTP ${list.status}`);
  let session = (list.json || []).find((s) => s.name === sessionName);
  if (!session) {
    console.log(`[gateway] membuat sesi WhatsApp "${sessionName}" ...`);
    const created = await openwaApi("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name: sessionName }),
    });
    if (!created.ok) throw new Error(`buat sesi gagal: HTTP ${created.status} ${created.text.slice(0, 200)}`);
    session = created.json;
  }
  if (session.status !== "ready") {
    const started = await openwaApi(`/api/sessions/${session.id}/start`, { method: "POST" });
    if (!started.ok && started.status !== 400) {
      throw new Error(`start sesi gagal: HTTP ${started.status} ${started.text.slice(0, 200)}`);
    }
    console.log(`[gateway] sesi "${sessionName}" status: ${started.json?.status ?? session.status}`);
  }
  return session;
}

async function ensureWebhook(sessionId, webhookUrl) {
  const list = await openwaApi(`/api/sessions/${sessionId}/webhooks`);
  if (!list.ok) throw new Error(`daftar webhook gagal: HTTP ${list.status}`);
  const hooks = list.json || [];
  const existing = hooks.find((h) => String(h.url).includes("/api/wa/webhook"));
  if (existing) {
    if (existing.url === webhookUrl) return { id: existing.id, updated: false };
    const upd = await openwaApi(`/api/sessions/${sessionId}/webhooks/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ url: webhookUrl, events: ["message.received"] }),
    });
    if (!upd.ok) throw new Error(`update webhook gagal: HTTP ${upd.status} ${upd.text.slice(0, 200)}`);
    return { id: existing.id, updated: true };
  }
  const created = await openwaApi(`/api/sessions/${sessionId}/webhooks`, {
    method: "POST",
    body: JSON.stringify({ url: webhookUrl, events: ["message.received"] }),
  });
  if (!created.ok) throw new Error(`buat webhook gagal: HTTP ${created.status} ${created.text.slice(0, 200)}`);
  return { id: created.json?.id, updated: false };
}

// --- main -----------------------------------------------------------------
console.log("[gateway] menyiapkan tunnel publik ...");
const cloudflared = await ensureCloudflared();
let publicUrl = "";
try {
  publicUrl = await startTunnel(cloudflared);
} catch (err) {
  console.warn(`[gateway] tunnel gagal: ${err.message}`);
  console.warn("[gateway] lanjut tanpa URL publik (link pesan memakai localhost).");
}
const siteUrl = publicUrl || localApp;
// Webhook dikirim ke app di mesin yang sama; OpenWA dijalankan dengan
// WEBHOOK_SSRF_PROTECT=false sehingga 127.0.0.1 diizinkan. URL tunnel tidak
// dipakai untuk webhook karena DNS quick tunnel bisa belum siap / berubah.
const webhookUrl = `${localApp}/api/wa/webhook?s=${encodeURIComponent(secret)}`;

const running = await reachable(localApp);
if (running) {
  console.log(`[gateway] app sudah jalan di ${localApp} (link pesan memakai env proses itu).`);
} else {
  console.log(`[gateway] menjalankan Next.js di ${localApp} ...`);
  const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
  const web = run("web", process.execPath, [nextBin, "dev", "-p", String(appPort)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { NEXT_PUBLIC_SITE_URL: siteUrl },
  });
  prefix(web.stdout, "[web]");
  prefix(web.stderr, "[web]");
  for (let i = 0; i < 120 && !(await reachable(localApp)); i++) await sleep(1000);
  if (!(await reachable(localApp))) {
    console.error("[gateway] Next.js tidak siap. Cek log [web] di atas.");
    shutdown(1);
    await sleep(500);
  }
}

try {
  await ensureOpenwa();
  const session = await ensureSession();
  const hook = await ensureWebhook(session.id, webhookUrl);
  const line = "-".repeat(64);
  console.log(`\n${line}
  Situs lokal : ${localApp}
  Situs publik: ${publicUrl || "(tunnel tidak aktif)"}
  Webhook WA  : ${localApp}/api/wa/webhook?s=***
  OpenWA API  : ${openwaUrl}
  Sesi WA     : ${sessionName} (${session.id}) status ${session.status}
  Webhook sesi: ${hook.id ?? "?"} ${hook.updated ? "(URL diperbarui)" : "(baru/ sudah benar)"}
${line}
  ${session.status === "ready" ? "WhatsApp sudah tertaut." : "Belum tertaut: jalankan `npm run wa:session` lalu scan QR."}
  Ctrl+C untuk menghentikan tunnel + app + OpenWA.
${line}\n`);
} catch (err) {
  console.error(`[gateway] ${err.message}`);
  shutdown(1);
  await sleep(600);
}
