import { sql } from "@/lib/db";
import { driveDownloadResponse } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadRow = {
  file_name: string;
  mime: string;
  data: Uint8Array;
  storage: string;
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

function parseRange(value: string, total: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match) return null;
  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) return null;

  let start: number;
  let end: number;
  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : total - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total || end < start) {
    return null;
  }
  return { start, end: Math.min(end, total - 1) };
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const rangeHeader = req.headers.get("range");
  const rows = (await sql`
    select file_name, mime, data, storage, drive_file_id from uploads where code = ${code}
  `) as Array<UploadRow>;
  const file = rows[0];
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  const baseHeaders: Record<string, string> = {
    "Content-Disposition": contentDisposition(file.file_name, download),
    "Cache-Control": "private, no-transform, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // Kirim byte asli: tanpa transform/compress oleh proxy.
    "Content-Encoding": "identity",
    "Accept-Ranges": "bytes",
  };

  if (file.storage === "drive" && file.drive_file_id) {
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

  const bytes = new Uint8Array(file.data);
  const total = bytes.length;
  const headers: Record<string, string> = {
    ...baseHeaders,
    "Content-Type": file.mime || "application/octet-stream",
  };

  if (rangeHeader) {
    const range = parseRange(rangeHeader, total);
    if (!range) {
      return new Response("Rentang file tidak valid.", {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    const chunk = bytes.slice(range.start, range.end + 1);
    headers["Content-Length"] = String(chunk.length);
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${total}`;
    return new Response(chunk, { status: 206, headers });
  }

  headers["Content-Length"] = String(total);
  return new Response(bytes, { headers });
}
