import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { createZip } from "@/lib/zip";

export const runtime = "nodejs";

type UploadRow = { id: number; file_name: string; data: Uint8Array };

export async function GET(req: Request) {
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
    select id, file_name, data from uploads
    where customer_id = ${customer.id} and id = any(${ids}::int[])
    order by id`) as unknown as UploadRow[];
  if (!rows.length) return new Response("File tidak ditemukan.", { status: 404 });

  const zip = createZip(
    rows.map((row) => ({
      name: row.file_name,
      data: new Uint8Array(row.data),
    })),
  );

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
