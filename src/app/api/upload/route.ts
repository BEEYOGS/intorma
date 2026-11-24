import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { driveEnabled, driveUpload } from "@/lib/drive";
import {
  formatBytes,
  isAllowedUpload,
  sanitizeFileName,
  SERVER_UPLOAD_MAX_BYTES,
} from "@/lib/upload-rules";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Jalur untuk file kecil. File tetap dikirim ke Google Drive, bukan ke Neon.
 * File besar memakai /api/drive/init-upload + upload langsung dari browser.
 */
export async function POST(req: Request) {
  try {
    if (!driveEnabled()) {
      return NextResponse.json(
        { error: "Google Drive belum aktif. Hubungi admin sebelum mengunggah." },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Pilih file dulu." }, { status: 400 });
    }
    if (file.size === 0 || file.size > SERVER_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            `Ukuran file maksimal ${formatBytes(SERVER_UPLOAD_MAX_BYTES)} lewat jalur ini. ` +
            "File besar diunggah langsung ke Google Drive oleh browser.",
        },
        { status: 413 },
      );
    }

    const mime = file.type || "application/octet-stream";
    const safeName = sanitizeFileName(file.name, 160);
    if (!isAllowedUpload(safeName, mime)) {
      return NextResponse.json(
        {
          error:
            "Format file tidak didukung. Gunakan PDF, JPG, PNG, AI, PSD, CDR, EPS, TIFF, ZIP, atau dokumen kantor.",
        },
        { status: 400 },
      );
    }

    const code = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const customer = await getCustomer();
    const uploaded = await driveUpload({ name: safeName, mime, data: bytes });

    const rows = (await sql`
      insert into uploads (
        code, file_name, mime, size, storage, drive_file_id, drive_web_link, customer_id
      )
      values (
        ${code}, ${safeName}, ${mime}, ${bytes.length}, 'drive',
        ${uploaded.id}, ${uploaded.webViewLink}, ${customer?.id ?? null}
      )
      returning id`) as Array<{ id: number }>;

    return NextResponse.json({
      id: Number(rows[0]?.id ?? 0),
      code,
      url: `/api/upload/${code}`,
      name: safeName,
      size: bytes.length,
      mime,
      storage: "drive",
    });
  } catch (error) {
    console.error("upload failed", error);
    return NextResponse.json({ error: "Gagal mengunggah file. Coba lagi." }, { status: 500 });
  }
}
