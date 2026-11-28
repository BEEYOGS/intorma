import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { driveEnabled, inboxFolder, mintAccessToken } from "@/lib/drive";

export const dynamic = "force-dynamic";

/**
 * Token upload untuk browser. Token service account ber-scope drive.file,
 * jadi paling buruk hanya bisa menulis file baru ke folder inbox yang
 * sudah dibagikan ke service account.
 */
export async function GET() {
  const limited = await guardRate("upload_token", 30);
  if (limited) return limited;
  if (!driveEnabled()) {
    return NextResponse.json({ error: "upload belum dikonfigurasi" }, { status: 503 });
  }
  const token = await mintAccessToken();
  if (!token) return NextResponse.json({ error: "gagal mencetak token" }, { status: 502 });
  return NextResponse.json(
    { token, folder: inboxFolder() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
