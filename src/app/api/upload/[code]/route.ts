import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
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
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.file_name.replace(/"/g, "_")}"`,
      // Kirim byte asli: tanpa transform/compress oleh proxy.
      "Content-Encoding": "identity",
      "Cache-Control": "private, no-transform, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
