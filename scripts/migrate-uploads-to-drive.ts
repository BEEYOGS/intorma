import { readFileSync } from "node:fs";

// Muat .env.local lebih dulu supaya modul db/drive membaca env dengan benar.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!/^[A-Z]/.test(line)) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (!(key in process.env)) process.env[key] = value;
}

async function main() {
  const { sql } = await import("../src/lib/db");
  const { driveEnabled, driveUpload, driveFileMeta } = await import("../src/lib/drive");

  if (!driveEnabled()) throw new Error("Google Drive belum aktif. Cek environment variable.");

  type Row = {
    id: number;
    file_name: string;
    mime: string;
    size: string | number;
    data: Uint8Array;
  };

  const rows = (await sql.query(
    `select id, file_name, mime, size, data from uploads
     where drive_file_id is null
       and (storage = 'db' or (data is not null and octet_length(data) > 0))
     order by id`,
  )) as unknown as Row[];

  console.log(`File lama di Neon: ${rows.length}`);
  if (!rows.length) return;

  for (const row of rows) {
    const bytes = new Uint8Array(row.data);
    const uploaded = await driveUpload({
      name: String(row.file_name),
      mime: String(row.mime || "application/octet-stream"),
      data: bytes,
    });
    const meta = await driveFileMeta(uploaded.id);
    if (meta.size !== Number(row.size)) {
      throw new Error(
        `Ukuran tidak cocok untuk id ${row.id}: Drive ${meta.size}, DB ${Number(row.size)}`,
      );
    }
    await sql.query(
      `update uploads set storage = 'drive', drive_file_id = $1, drive_web_link = $2 where id = $3`,
      [uploaded.id, uploaded.webViewLink, row.id],
    );
    console.log(`OK  id=${row.id}  ${row.file_name}  ->  ${uploaded.id}`);
  }

  console.log("Semua file lama sudah berpindah ke Google Drive.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
