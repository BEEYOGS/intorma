// Pastikan selalu ada satu akun owner di database, bukan hanya fallback env.
// Password dibaca dari ADMIN_PASSWORD dan disimpan sebagai hash scrypt.
// Pakai: npm run db:admin-owner
import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const password = String(process.env.ADMIN_PASSWORD || "");
const url = process.env.DATABASE_URL;
if (!url || !password) {
  console.error("DATABASE_URL dan ADMIN_PASSWORD wajib diisi.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const sql = neon(url);
const rows = await sql.query(
  `insert into admin_accounts (username, label, password_hash, role)
   values ('owner', 'Owner', $1, 'owner')
   on conflict (username) do update set role = 'owner', active = true, updated_at = now()
   returning id, username, role`,
  [hash],
);
console.log(`Owner database siap: ${rows[0]?.username} (${rows[0]?.role}). Password tidak ditampilkan.`);
