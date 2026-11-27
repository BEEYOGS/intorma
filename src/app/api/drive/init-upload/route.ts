import { NextResponse } from "next/server";
import { driveEnabled, driveInitResumable } from "@/lib/drive";
import {
  DRIVE_CHUNK_BYTES,
  DRIVE_UPLOAD_MAX_BYTES,
  formatDriveFileName,
  isAllowedUpload,
} from "@/lib/upload-rules";
import { verifyUploadToken } from "@/lib/upload-token";
import { clientErrorMessage } from "@/lib/error";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  fileName?: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
  orderCode?: unknown;
  customerName?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  if (!driveEnabled()) {
    return NextResponse.json(
      {
        error:
          "Penyimpanan Google Drive belum aktif. Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, dan GOOGLE_DRIVE_FOLDER_ID.",
        drive: false,
      },
      { status: 503 },
    );
  }

  if (!verifyUploadToken(req.headers.get("x-upload-token"))) {
    return NextResponse.json(
      { error: "Sesi upload kedaluwarsa. Muat ulang halaman lalu coba lagi.", drive: true },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Data upload tidak valid." }, { status: 400 });
  }

  const fileName = text(body.fileName, 240);
  const mimeType = text(body.mimeType, 120) || "application/octet-stream";
  const fileSize = Number(body.fileSize);
  const orderCode = text(body.orderCode, 40);
  const customerName = text(body.customerName, 100);

  if (!fileName) {
    return NextResponse.json({ error: "Nama file kosong." }, { status: 400 });
  }
  if (!isAllowedUpload(fileName, mimeType)) {
    return NextResponse.json(
      {
        error:
          "Format file tidak didukung. Gunakan PDF, JPG, PNG, AI, PSD, CDR, EPS, TIFF, ZIP, atau dokumen kantor.",
      },
      { status: 400 },
    );
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "Ukuran file tidak valid." }, { status: 400 });
  }
  if (fileSize > DRIVE_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi batas Google Drive (5 TB)." },
      { status: 400 },
    );
  }

  const formattedFileName = formatDriveFileName({
    orderCode: orderCode || null,
    customerName: customerName || null,
    originalName: fileName,
  });

  const originHeader = req.headers.get("origin");
  const origin =
    originHeader && /^https?:\/\//i.test(originHeader)
      ? originHeader
      : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://intorma-psi.vercel.app";

  try {
    const session = await driveInitResumable({
      name: formattedFileName,
      mime: mimeType,
      size: Math.floor(fileSize),
      origin,
    });
    return NextResponse.json(
      {
        uploadUrl: session.uploadUrl,
        formattedFileName,
        chunkSize: DRIVE_CHUNK_BYTES,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("drive init-upload failed", error);
    return NextResponse.json(
      {
        error: clientErrorMessage(error, "Gagal menyiapkan upload ke Google Drive."),
        drive: true,
      },
      { status: 502 },
    );
  }
}
