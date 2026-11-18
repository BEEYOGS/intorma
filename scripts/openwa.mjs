// Jalankan OpenWA gateway (repo terpisah: https://github.com/rmyndharis/OpenWA)
// tanpa Docker, memakai Node 22 portable karena better-sqlite3 belum punya
// prebuilt untuk Node 26 di mesin ini.
//
// Pakai: npm run openwa
//
// Environment opsional:
//   OPENWA_DIR        folder repo OpenWA (default: ..\OpenWA)
//   OPENWA_NODE       path node.exe 22 (default: .tools\node22\node.exe di home)
//   OPENWA_DIST_MAIN  entry hasil build (default: dist/main.js)
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

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
const openwaDir = resolve(env.OPENWA_DIR || join(root, "..", "OpenWA"));
const main = resolve(openwaDir, env.OPENWA_DIST_MAIN || join("dist", "main.js"));
const candidates = [
  env.OPENWA_NODE,
  join(homedir(), ".tools", "node22", "node.exe"),
  process.execPath,
].filter(Boolean);
const nodeBin = candidates.find((p) => existsSync(p));

if (!existsSync(openwaDir)) {
  console.error(`[openwa] folder tidak ditemukan: ${openwaDir}`);
  process.exit(1);
}
if (!existsSync(main)) {
  console.error(`[openwa] build belum ada: ${main}`);
  console.error("[openwa] jalankan dulu di folder OpenWA (pakai Node 22):");
  console.error("         npm run build");
  process.exit(1);
}

const port = env.OPENWA_PORT || "2785";
console.log(`[openwa] ${nodeBin}`);
console.log(`[openwa] gateway di http://127.0.0.1:${port} (cwd ${openwaDir})`);

const child = spawn(nodeBin, [main], {
  cwd: openwaDir,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code, signal) => {
  if (signal) console.log(`[openwa] berhenti (${signal})`);
  process.exit(code ?? 0);
});
