// Aktivasi Fonnte ke Vercel tanpa menampilkan token di terminal/chat.
// Isi FONNTE_TOKEN di .env.local, lalu jalankan: npm run wa:fonnte:setup
import { spawn } from "node:child_process";
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
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
if (!String(env.FONNTE_TOKEN || "").trim()) {
  console.error("Isi FONNTE_TOKEN di .env.local dulu.");
  process.exit(1);
}

const values = {
  WA_PROVIDER: "fonnte",
  FONNTE_TOKEN: env.FONNTE_TOKEN,
};
// Jangan menimpa WA_WEBHOOK_SECRET di Vercel kalau hanya OPENWA_WEBHOOK_SECRET
// yang ada lokal: URL webhook Fonnte bisa memakai secret produksi yang berbeda.
const webhookSecret = String(env.WA_WEBHOOK_SECRET || "").trim();
if (webhookSecret) values.WA_WEBHOOK_SECRET = webhookSecret;
const admin = String(env.ADMIN_WHATSAPP_NUMBER || env.ADMIN_WA || "").trim();
if (admin) values.ADMIN_WHATSAPP_NUMBER = admin;

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
for (const [key, value] of Object.entries(values)) {
  const args = [
    "--no-install",
    "vercel",
    "env",
    "add",
    key,
    "--environment",
    "production",
    "--force",
    "--yes",
  ];
  if (key !== "WA_PROVIDER") args.push("--sensitive");
  const child = spawn(npx, args, {
    cwd: root,
    env: process.env,
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk.toString()));
  child.stderr.on("data", (chunk) => (output += chunk.toString()));
  child.stdin.end(`${String(value).trim()}\n`);
  const code = await new Promise((resolveCode) => child.on("close", resolveCode));
  if (code !== 0) {
    console.error(`Gagal menyimpan ${key}:\n${output.slice(-800)}`);
    process.exit(code ?? 1);
  }
  console.log(`Tersimpan: ${key}`);
}

console.log("\nSelesai. Di dashboard Fonnte → Device → Edit, set Webhook URL ke /api/wa/webhook/<WA_WEBHOOK_SECRET> produksi.");
console.log("Jangan tempel token atau URL webhook ke chat.");
console.log("Deploy ulang: npx --no-install vercel --prod --yes");
