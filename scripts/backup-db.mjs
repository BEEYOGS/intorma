import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set. Jalankan dengan --env-file=.env.local");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
const file = join(dir, `intorma-${stamp}.sql`);

const child = spawn("pg_dump", [url, "-f", file, "--no-owner", "--no-acl"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error("pg_dump tidak tersedia:", error.message);
  console.error("Install PostgreSQL client tools, lalu jalankan ulang script ini.");
  process.exit(1);
});

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Backup selesai: ${file}`);
  } else {
    console.error(`pg_dump keluar dengan kode ${code}.`);
    process.exit(code ?? 1);
  }
});
