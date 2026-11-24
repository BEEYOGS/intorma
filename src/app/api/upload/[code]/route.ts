import { sql } from "@/lib/db";
import { driveDownloadResponse } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadRow = {
  file_name: string;
  mime: string;
  drive_file_id: string | null;
};

function contentDisposition(name: string, download: boolean): string {
  const ascii = name
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 180);
  return `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    name,
  )}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const rangeHeader = req.headers.get("range");
  const rows = (await sql`
    select file_name, mime, drive_file_id from uploads where code = ${code}
  `) as Array<UploadRow>;
  const file = rows[0];
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });
  if (!file.drive_file_id) {
    return new Response("File lama belum tersedia di Google Drive. Hubungi admin.", { status: 410 });
  }

  const baseHeaders: Record<string, string> = {
    "Content-Disposition": contentDisposition(file.file_name, download),
    "Cache-Control": "private, no-transform, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // Kirim byte asli: tanpa transform/compress oleh proxy.
    "Content-Encoding": "identity",
    "Accept-Ranges": "bytes",
  };

  try {
    const upstream = await driveDownloadResponse(file.drive_file_id, rangeHeader);
    const headers: Record<string, string> = {
      ...baseHeaders,
      "Content-Type": upstream.headers.get("content-type") || file.mime || "application/octet-stream",
    };
    const length = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (length) headers["Content-Length"] = length;
    if (contentRange) headers["Content-Range"] = contentRange;
    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("drive download failed", error);
    return new Response("Gagal mengambil file dari penyimpanan.", { status: 502 });
  }
}
