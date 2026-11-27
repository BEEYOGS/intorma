// Worker WhatsApp untuk in.torma.
//
// Vercel tidak bisa menjangkau OpenWA yang berjalan di localhost. Aplikasi web
// menyimpan notifikasi ke tabel wa_outbox, lalu skrip ini (di komputer yang
// menjalankan OpenWA) mengambil dan mengirimkannya.
//
// Skrip ini juga menyediakan webhook lokal (/webhook) untuk balasan otomatis
// "status INT-DDMMYY001", supaya tidak bergantung pada deployment Vercel.
//
// Pakai: npm run wa:agent
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
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
const databaseUrl = env.DATABASE_URL;
const base = (env.OPENWA_URL || "http://127.0.0.1:2785").replace(/\/$/, "");
const key = env.OPENWA_KEY || "";
const sessionName = env.OPENWA_SESSION || "intorma";
const pollMs = Math.max(2000, Number(env.WA_POLL_MS || 5000));
const inboxPort = Number(env.WA_INBOX_PORT || 2786);
const inboxSecret = String(env.WA_INBOX_SECRET || env.OPENWA_WEBHOOK_SECRET || "");
const site = (env.NEXT_PUBLIC_SITE_URL || "https://intorma-psi.vercel.app").replace(/\/$/, "");

if (!databaseUrl) {
  console.error("[wa-agent] DATABASE_URL kosong di .env.local");
  process.exit(1);
}
if (!key) {
  console.error("[wa-agent] OPENWA_KEY kosong di .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const stamp = () => new Date().toLocaleTimeString("id-ID", { hour12: false });

let stopping = false;
let lastNotice = "";
let sessionState = null;
let lastTickAt = null;
const startedAt = Date.now();

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

  sessionState = session;
  return session;
}

function normalizeNumber(value) {
  let n = String(value ?? "").replace(/@.*$/, "").replace(/\D/g, "");
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  return n;
}

async function sendText(number, text, sessionId, idempotencyKey) {
  const headers = { "content-type": "application/json", "x-api-key": key };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${base}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chatId: `${number}@c.us`,
      text: String(text).slice(0, 4000),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (res.ok) return { ok: true };
  const body = await res.text().catch(() => "");
  return { ok: false, error: `HTTP ${res.status}${body ? ` — ${body.slice(0, 180)}` : ""}` };
}

async function sendMessage(row, sessionId) {
  return sendText(normalizeNumber(row.to_number), row.content, sessionId, row.idempotency_key);
}

async function markSent(id) {
  await sql.query(
    `update wa_outbox
     set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null
     where id = $1`,
    [id],
  );
}

async function markFailed(row, error) {
  const attempts = Number(row.attempts) + 1;
  const final = attempts >= 8;
  const delaySeconds = Math.min(1800, 30 * 2 ** (attempts - 1));
  await sql.query(
    `update wa_outbox
     set status = $2,
         attempts = $3,
         last_error = $4,
         next_attempt_at = now() + make_interval(secs => $5)
     where id = $1`,
    [row.id, final ? "failed" : "pending", attempts, String(error).slice(0, 500), delaySeconds],
  );
  return { attempts, final, delaySeconds };
}

// --- balasan otomatis "status INT-DDMMYY001" ----------------------------------
const STATUS_LABEL = {
  menunggu: "Menunggu konfirmasi",
  dikerjakan: "Sedang dikerjakan",
  revisi: "Revisi",
  selesai: "Selesai",
  batal: "Dibatalkan",
};

function rupiah(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

async function statusReply(text) {
  const match = String(text).match(/status\s*[:#-]?\s*(?:INT[-\s]?)?([A-Z0-9]{6,})/i);
  if (!match) return null;
  const code = `INT-${match[1].toUpperCase()}`;
  const rows = await sql.query(
    "select code, status, price, note, paid from orders where code = $1",
    [code],
  );
  const order = rows[0];
  if (!order) return { code, text: `Kode ${code} tidak ditemukan. Cek lagi kodenya.` };

  const lines = [
    `Pesanan ${order.code}: ${STATUS_LABEL[order.status] ?? "Menunggu konfirmasi"}`,
    order.price ? `Total: ${rupiah(order.price)}` : null,
    order.price ? (order.paid ? "Pembayaran: lunas" : "Pembayaran: belum dibayar") : null,
    order.note ? `Catatan: ${order.note}` : null,
    `Detail: ${site}/lacak/${order.code}`,
  ];
  return { code, text: lines.filter(Boolean).join("\n") };
}

async function handleWebhook(payload) {
  if (payload?.event !== "message.received" || !payload?.data) {
    return { ok: true, ignored: true };
  }
  const msg = payload.data;
  const from = String(msg.from ?? msg.chatId ?? msg.key?.remoteJid ?? "");
  const isGroup =
    msg.isGroup === true || msg.isGroupMsg === true || from.endsWith("@g.us");
  if (!from || msg.fromMe === true || isGroup) return { ok: true, ignored: true };

  const body = String(msg.body ?? msg.text ?? msg.content ?? msg.message?.conversation ?? "");
  const reply = await statusReply(body);
  if (!reply) return { ok: true, ignored: true };

  const number = normalizeNumber(from);
  const session = sessionState?.status === "ready" ? sessionState : await ensureSession();
  if (session?.status !== "ready" || !session?.id) {
    await sql.query(
      "insert into wa_outbox (to_number, content) values ($1, $2)",
      [number, reply.text],
    );
    return { ok: true, queued: true, code: reply.code };
  }

  const sent = await sendText(number, reply.text, session.id);
  if (!sent.ok) {
    await sql.query(
      "insert into wa_outbox (to_number, content) values ($1, $2)",
      [number, reply.text],
    );
    console.warn(`[wa-agent ${stamp()}] balasan ${reply.code} gagal (${sent.error}); masuk antrean.`);
    return { ok: true, queued: true, code: reply.code };
  }
  console.log(`[wa-agent ${stamp()}] balas status ${reply.code} → ${number}`);
  return { ok: true, replied: true, code: reply.code };
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("payload terlalu besar"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

const inbox = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${inboxPort}`);
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        gateway: base,
        session: sessionState
          ? { id: sessionState.id, name: sessionState.name, status: sessionState.status, phone: sessionState.phone }
          : null,
        lastTickAt,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/webhook") {
      const given = String(req.headers["x-webhook-secret"] ?? "");
      if (!inboxSecret || given !== inboxSecret) {
        json(res, 401, { ok: false });
        return;
      }
      const raw = await readBody(req);
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        json(res, 400, { ok: false, error: "JSON invalid" });
        return;
      }
      json(res, 200, await handleWebhook(payload));
      return;
    }
    json(res, 404, { ok: false });
  } catch (error) {
    console.error(`[wa-agent ${stamp()}] webhook error: ${error instanceof Error ? error.message : error}`);
    json(res, 500, { ok: false });
  }
});

inbox.on("error", (error) => {
  console.warn(`[wa-agent] inbox tidak bisa listen di ${inboxPort}: ${error.message}`);
});

async function tick() {
  const session = await ensureSession();
  lastTickAt = new Date().toISOString();
  if (!session?.id || session.status !== "ready") {
    notice("sesi WhatsApp belum ready. Menunggu scan/verifikasi.");
    return;
  }

  const rows = await sql.query(
    `select id, to_number, content, attempts, idempotency_key
     from wa_outbox
     where status = 'pending' and next_attempt_at <= now()
     order by id
     limit 10`,
  );

  if (!rows.length) {
    notice("terhubung. Menunggu pesan baru.");
    return;
  }

  for (const row of rows) {
    if (stopping) return;
    const result = await sendMessage(row, session.id);
    if (result.ok) {
      await markSent(row.id);
      console.log(`[wa-agent ${stamp()}] terkirim #${row.id} → ${row.to_number}`);
    } else {
      const state = await markFailed(row, result.error);
      console.warn(
        `[wa-agent ${stamp()}] gagal #${row.id} (${state.attempts}/8): ${result.error}` +
          (state.final ? " — ditandai failed" : ` — coba lagi dalam ${state.delaySeconds}s`),
      );
    }
  }
}

console.log(`[wa-agent] OpenWA: ${base}`);
console.log(`[wa-agent] Sesi: ${sessionName} · antrean dicek tiap ${pollMs / 1000}s`);
console.log(`[wa-agent] Inbox: http://127.0.0.1:${inboxPort}/webhook`);

inbox.listen(inboxPort, "127.0.0.1", () => {
  console.log(`[wa-agent] Webhook lokal siap di http://127.0.0.1:${inboxPort}/health`);
});

const shutdown = () => {
  stopping = true;
  inbox.close();
  console.log("\n[wa-agent] berhenti.");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

while (!stopping) {
  try {
    await tick();
  } catch (error) {
    console.error(`[wa-agent ${stamp()}] ${error instanceof Error ? error.message : error}`);
  }
  await sleep(pollMs);
}
