import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { driveEnabled, driveUpload } from "@/lib/drive";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // batas aman untuk serverless (body Next.js ±4,5 MB)
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/postscript",
  "application/illustrator",
  "application/photoshop",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXT = /\.(pdf|jpe?g|png|webp|ai|psd|cdr|zip|docx?|eps)$/i;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Pilih file dulu." }, { status: 400 });
    }
    const useDrive = driveEnabled();
    const maxBytes = useDrive ? 20 * 1024 * 1024 : MAX_BYTES;
    if (file.size === 0 || file.size > maxBytes) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.` },
        { status: 400 },
      );
    }
    const mime = file.type || "application/octet-stream";
    const safeName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 160) || "file";
    if (!ALLOWED.has(mime) && !ALLOWED_EXT.test(safeName)) {
      return NextResponse.json({ error: "Format file tidak didukung. Gunakan PDF, JPG, PNG, AI, PSD, CDR, atau ZIP." }, { status: 400 });
    }

    const code = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const customer = await getCustomer();
    let driveFileId: string | null = null;
    let storedBytes: Uint8Array = bytes;

    if (useDrive) {
      const uploaded = await driveUpload({ name: safeName, mime, data: bytes });
      driveFileId = uploaded.id;
      storedBytes = new Uint8Array();
    }

    const rows = (await sql`
      insert into uploads (code, file_name, mime, size, data, storage, drive_file_id, customer_id)
      values (${code}, ${safeName}, ${mime}, ${bytes.length}, ${storedBytes},
        ${useDrive ? "drive" : "db"}, ${driveFileId}, ${customer?.id ?? null})
      returning id`) as Array<{ id: number }>;

    return NextResponse.json({
      id: Number(rows[0]?.id ?? 0),
      url: `/api/upload/${code}`,
      name: safeName,
      size: bytes.length,
      storage: useDrive ? "drive" : "db",
    });
  } catch (error) {
    console.error("upload failed", error);
    return NextResponse.json({ error: "Gagal mengunggah file. Coba lagi." }, { status: 500 });
  }
}
