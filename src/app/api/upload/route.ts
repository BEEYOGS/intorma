import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Jalur upload kecil sudah dinonaktifkan. Semua file kini diunggah langsung ke
 * Google Drive lewat /api/drive/init-upload + /api/drive/finalize-upload, jadi
 * tidak ada endpoint publik yang bisa mengisi folder Drive tanpa sesi.
 * Klien lama tetap mendapat pesan yang jelas (410), bukan halaman kosong.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Gunakan unggah langsung ke Google Drive dari halaman pesanan atau portal." },
    { status: 410 },
  );
}
