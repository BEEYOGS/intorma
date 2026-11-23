import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rows = (await sql`select file_name, mime, data from uploads where code = ${code}`) as Array<{
    file_name: string;
    mime: string;
    data: Uint8Array;
  }>;
  const file = rows[0];
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.file_name.replace(/"/g, "_")}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
