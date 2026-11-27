import { guardRate } from "@/lib/api-rate-limit";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { driveDownload } from "@/lib/drive";
import { createZip } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadRow = {
  id: number;
  file_name: string;
  drive_file_id: string | null;
  size: number | string | null;
};

export async function GET(req: Request) {
  const limited = await guardRate("files_zip", 6);
  if (limited) return limited;
  const customer = await getCustomer();
  if (!customer) return new Response("Silakan masuk dulu.", { status: 401 });

  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).slice(0, 50);
  if (!ids.length) return new Response("Pilih minimal satu file.", { status: 400 });

  const rows = (await sql`
    select id, file_name, drive_file_id, size from uploads
    where customer_id = ${customer.id} and id = any(${ids}::int[])
    order by id`) as unknown as UploadRow[];
  if (!rows.length) return new Response("File tidak ditemukan.", { status: 404 });

  // Batasi total byte sebelum mengunduh apa pun dari Drive ke memory serverless.
  const zipMaxBytes = 200 * 1024 * 1024;
  const total = rows.reduce((sum, row) => sum + Number(row.size ?? 0), 0);
  if (!Number.isFinite(total) || total > zipMaxBytes) {
    return new Response(
      "Total file terlalu besar untuk satu ZIP (maksimal 200 MB). Pilih lebih sedikit file.",
      { status: 413 },
    );
  }

  const entries = [];
  for (const row of rows) {
    if (!row.drive_file_id) {
      return new Response("Sebagian file lama belum tersedia di Google Drive. Hubungi admin.", {
        status: 410,
      });
    }
    try {
      const data = await driveDownload(row.drive_file_id);
      entries.push({ name: row.file_name, data });
    } catch {
      return new Response("Sebagian file gagal diambil dari Google Drive.", { status: 502 });
    }
  }
  const zip = createZip(entries);

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="in-torma-file.zip"',
      "Content-Encoding": "identity",
      "Cache-Control": "private, no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
