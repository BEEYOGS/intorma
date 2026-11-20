// Daftarkan/Perbarui webhook sesi OpenWA ke situs publik (mis. Vercel),
// supaya balasan otomatis "status INT-XXXXXX" tetap masuk.
//
// Pakai: npm run wa:webhook
// Opsional: SITE_WEBHOOK_URL=https://domain/api/wa/webhook npm run wa:webhook
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
const site = (env.SITE_WEBHOOK_URL || env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

if (!key) {
  console.error("[wa-webhook] OPENWA_KEY kosong di .env.local");
  process.exit(1);
}
if (!secret) {
  console.error("[wa-webhook] OPENWA_WEBHOOK_SECRET kosong di .env.local");
  process.exit(1);
}
if (!site) {
  console.error(
    "[wa-webhook] NEXT_PUBLIC_SITE_URL kosong. Isi URL publik, mis. https://intorma-psi.vercel.app",
  );
  process.exit(1);
}

const webhookUrl = `${site}/api/wa/webhook?s=${encodeURIComponent(secret)}`;

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

const list = await api(`/api/sessions?name=${encodeURIComponent(sessionName)}`);
if (!list.ok) {
  console.error(`[wa-webhook] gagal membaca sesi: HTTP ${list.status}. Pastikan OpenWA jalan.`);
  process.exit(1);
}
const session = (list.json || []).find((item) => item.name === sessionName);
if (!session?.id) {
  console.error(`[wa-webhook] sesi "${sessionName}" belum ada. Jalankan npm run wa:session dulu.`);
  process.exit(1);
}

const hooks = await api(`/api/sessions/${session.id}/webhooks`);
if (!hooks.ok) {
  console.error(`[wa-webhook] gagal membaca webhook: HTTP ${hooks.status}`);
  process.exit(1);
}

const existing = (hooks.json || []).find((hook) => String(hook.url).includes("/api/wa/webhook"));
const payload = { url: webhookUrl, events: ["message.received"] };

if (existing) {
  const updated = await api(`/api/sessions/${session.id}/webhooks/${existing.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!updated.ok) {
    console.error(`[wa-webhook] update gagal: HTTP ${updated.status} ${updated.text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`[wa-webhook] diperbarui: ${webhookUrl}`);
} else {
  const created = await api(`/api/sessions/${session.id}/webhooks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!created.ok) {
    console.error(`[wa-webhook] buat gagal: HTTP ${created.status} ${created.text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`[wa-webhook] terdaftar: ${webhookUrl}`);
}

console.log(`[wa-webhook] sesi ${sessionName} (${session.status}) · event message.received`);
if (/localhost|127\.0\.0\.1/.test(webhookUrl)) {
  console.log("[wa-webhook] URL lokal: balasan otomatis hanya jalan saat Next.js lokal aktif.");
}
