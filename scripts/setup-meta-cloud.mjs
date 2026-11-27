// Aktivasi WhatsApp Cloud API ke Vercel tanpa menampilkan secret di terminal.
// Isi dulu META_* di .env.local, lalu jalankan: npm run wa:cloud:setup
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
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const required = [
  "META_WA_TOKEN",
  "META_WA_PHONE_ID",
  "META_WA_VERIFY_TOKEN",
  "META_WA_APP_SECRET",
];
const missing = required.filter((key) => !String(env[key] || "").trim());
if (missing.length) {
  console.error(`Isi dulu di .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const values = {
  WA_PROVIDER: "cloud",
  META_WA_TOKEN: env.META_WA_TOKEN,
  META_WA_PHONE_ID: env.META_WA_PHONE_ID,
  META_WA_VERSION: env.META_WA_VERSION || "v25.0",
  META_WA_VERIFY_TOKEN: env.META_WA_VERIFY_TOKEN,
  META_WA_APP_SECRET: env.META_WA_APP_SECRET,
  META_TPL_LANGUAGE: env.META_TPL_LANGUAGE || "id",
};
if (String(env.ADMIN_WHATSAPP_NUMBER || env.ADMIN_WA || "").trim()) {
  values.ADMIN_WHATSAPP_NUMBER = env.ADMIN_WHATSAPP_NUMBER || env.ADMIN_WA;
}
for (const key of ["ORDER", "ADMIN", "STATUS", "PAYMENT", "REMINDER", "REORDER"]) {
  const name = `META_TPL_${key}`;
  if (String(env[name] || "").trim()) values[name] = env[name];
}

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
    "--sensitive",
  ];
  const child = spawn(npx, args, {
    cwd: root,
    env: process.env,
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

console.log("\nSelesai. Langkah berikutnya di Meta Business Manager:");
console.log("1. Webhook: https://intorma-psi.vercel.app/api/wa/webhook");
console.log("2. Verify token: sama dengan META_WA_VERIFY_TOKEN");
console.log("3. Subscribe field: messages");
console.log("4. Setujui 6 template yang ada di README.md / .env.example");
console.log("5. Deploy ulang: npx --no-install vercel --prod --yes");
