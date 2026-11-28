import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint lama yang mengembalikan access token Google Drive ke browser.
 * Sudah tidak dipakai: sesi resumable kini dibuat server-side di
 * /api/drive/init-upload dan browser hanya menyimpan URL sesi tersebut.
 * Dipertahankan sebagai 410 supaya klien lama mendapat pesan yang jelas.
 */
export function GET() {
  return NextResponse.json(
    { error: "Endpoint upload lama sudah tidak dipakai. Muat ulang halaman." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
