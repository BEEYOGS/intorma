import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { driveEnabled, driveFileMeta, driveFolderId } from "@/lib/drive";
import { isAllowedUpload, sanitizeFileName } from "@/lib/upload-rules";
import { verifyUploadToken } from "@/lib/upload-token";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { driveFileId?: unknown };

function uploadCode(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function POST(req: Request) {
  const limited = await guardRate("drive_finalize", 30);
  if (limited) return limited;
  if (!driveEnabled()) {
    return NextResponse.json({ error: "Google Drive belum aktif.", drive: false }, { status: 503 });
  }
  const customer = await getCustomer().catch(() => null);
  if (!verifyUploadToken(req.headers.get("x-upload-token"), customer?.id ?? null)) {
    return NextResponse.json(
      { error: "Sesi upload kedaluwarsa. Muat ulang halaman lalu coba lagi." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Data file tidak valid." }, { status: 400 });
  }
  const driveFileId = typeof body.driveFileId === "string" ? body.driveFileId.trim() : "";
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(driveFileId)) {
    return NextResponse.json({ error: "ID file Google Drive tidak valid." }, { status: 400 });
  }

  const folder = driveFolderId();
  let meta;
  try {
    meta = await driveFileMeta(driveFileId);
  } catch (error) {
    console.error("drive finalize metadata failed", error);
    return NextResponse.json(
      { error: "File tidak ditemukan di Google Drive. Coba upload ulang." },
      { status: 400 },
    );
  }

  if (!meta.parents || !meta.parents.includes(folder)) {
    return NextResponse.json(
      { error: "File tidak berada di folder upload in.torma." },
      { status: 403 },
    );
  }
  if (!isAllowedUpload(meta.name, meta.mimeType)) {
    return NextResponse.json({ error: "Format file tidak didukung." }, { status: 400 });
  }

  // Kalau finalize dipanggil ulang (retry jaringan), kembalikan baris yang sama.
  const existing = (await sql`
    select id, code, file_name, mime, size from uploads
    where drive_file_id = ${driveFileId}
      and created_at >= now() - interval '6 hours'
      and ${customer?.id ?? null} is not null
      and customer_id = ${customer?.id ?? null}
    limit 1`) as Array<{ id: number; code: string; file_name: string; mime: string; size: string | number }>;
  if (existing[0]) {
    const row = existing[0];
    return NextResponse.json({
      id: Number(row.id),
      code: row.code,
      url: `/api/upload/${row.code}`,
      name: row.file_name,
      size: Number(row.size),
      mime: row.mime,
      storage: "drive",
    });
  }

  const code = uploadCode();
  const safeName = sanitizeFileName(meta.name, 200);
  const size = Math.max(0, Math.floor(meta.size));

  try {
    const rows = (await sql`
      insert into uploads (
        code, file_name, mime, size, storage, drive_file_id, drive_web_link, customer_id
      )
      values (
        ${code}, ${safeName}, ${meta.mimeType}, ${size},
        'drive', ${driveFileId}, ${meta.webViewLink}, ${customer?.id ?? null}
      )
      returning id`) as Array<{ id: number }>;

    return NextResponse.json({
      id: Number(rows[0]?.id ?? 0),
      code,
      url: `/api/upload/${code}`,
      name: safeName,
      size,
      mime: meta.mimeType,
      storage: "drive",
    });
  } catch (error) {
    console.error("drive finalize insert failed", error);
    return NextResponse.json(
      { error: "File sudah terunggah ke Drive, tetapi gagal dicatat. Coba lagi." },
      { status: 500 },
    );
  }
}
