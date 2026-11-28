import { NextResponse } from "next/server";
import { guardRate } from "@/lib/api-rate-limit";
import { getCustomer } from "@/lib/customer-auth";
import { driveEnabled, inboxFolder, mintAccessToken } from "@/lib/drive";
import { verifyUploadToken } from "@/lib/upload-token";

export const dynamic = "force-dynamic";

/**
 * Token upload untuk browser. Token service account ber-scope drive.file,
 * jadi paling buruk hanya bisa menulis file baru ke folder inbox yang
 * sudah dibagikan ke service account.
 */
export async function GET(req: Request) {
  const limited = await guardRate("upload_token", 30);
  if (limited) return limited;
  const customer = await getCustomer().catch(() => null);
  if (!verifyUploadToken(req.headers.get("x-upload-token"), customer?.id ?? null)) {
    return NextResponse.json({ error: "Sesi upload tidak valid." }, { status: 401 });
  }
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
