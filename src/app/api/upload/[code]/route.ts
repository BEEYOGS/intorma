import { sql } from "@/lib/db";
import { driveDownload } from "@/lib/drive";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const rows = (await sql`
    select file_name, mime, data, storage, drive_file_id from uploads where code = ${code}
  `) as Array<{
    file_name: string;
    mime: string;
    data: Uint8Array;
    storage: string;
    drive_file_id: string | null;
  }>;
  const file = rows[0];
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  let bytes: Uint8Array;
  try {
    bytes =
      file.storage === "drive" && file.drive_file_id
        ? await driveDownload(file.drive_file_id)
        : new Uint8Array(file.data);
  } catch {
    return new Response("Gagal mengambil file dari penyimpanan.", { status: 502 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.file_name.replace(/"/g, "_")}"`,
      // Kirim byte asli: tanpa transform/compress oleh proxy.
      "Content-Encoding": "identity",
      "Cache-Control": "private, no-transform, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
