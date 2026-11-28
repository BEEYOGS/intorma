import { guardRate } from "@/lib/api-rate-limit";
import { sql } from "@/lib/db";
import { driveDownloadResponse } from "@/lib/drive";
import { cleanAccessToken, hasOrderAccess } from "@/lib/order-access";
import { isAttachment } from "@/lib/upload-rules";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadRow = {
  file_name: string;
  mime: string;
  drive_file_id: string | null;
  upload_customer_id: number | null;
  order_id: number | null;
  order_code: string | null;
  access_token: string | null;
  order_customer_id: number | null;
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
  const limited = await guardRate("upload_file", 120);
  if (limited) return limited;

  const { code } = await params;
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const rangeHeader = req.headers.get("range");
  const rows = (await sql`
    select
      u.file_name,
      u.mime,
      u.drive_file_id,
      u.customer_id as upload_customer_id,
      u.order_id,
      o.code as order_code,
      o.access_token,
      o.customer_id as order_customer_id
    from uploads u
    left join orders o on o.id = u.order_id
    where u.code = ${code}
  `) as Array<UploadRow>;
  const file = rows[0];
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  const allowed = await hasOrderAccess(
    {
      id: file.order_id ?? undefined,
      code: file.order_code ?? undefined,
      access_token: file.access_token ?? null,
      customer_id: file.order_customer_id ?? file.upload_customer_id ?? null,
    },
    cleanAccessToken(url.searchParams.get("t")),
  );
  if (!allowed) {
    return new Response("Butuh tautan pribadi atau sesi pemilik pesanan.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (!file.drive_file_id) {
    return new Response("File lama belum tersedia di Google Drive. Hubungi admin.", { status: 410 });
  }

  const forceAttachment = isAttachment(file.mime, file.file_name);
  const baseHeaders: Record<string, string> = {
    "Content-Disposition": contentDisposition(file.file_name, download || forceAttachment),
    "Cache-Control": "private, no-transform, no-store",
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
