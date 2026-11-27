import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "./rate-limit";

/**
 * Pembatasan untuk route handler publik. Memakai store Neon yang sama dengan
 * server action, tidak bergantung pada instance/serverless region tertentu.
 * Fail-closed: bila store bermasalah, permintaan ditolak sementara.
 */
export async function guardRate(
  scope: string,
  limit: number,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  let result;
  try {
    result = await rateLimit(await clientKey(scope), limit, windowMs);
  } catch (error) {
    console.error(`rate limit failed for ${scope}`, error);
    return NextResponse.json(
      { error: "Layanan sedang sibuk. Coba lagi sebentar." },
      { status: 503, headers: { "Retry-After": "10" } },
    );
  }
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
