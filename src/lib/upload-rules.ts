// Aturan upload dipakai bersama oleh API route dan komponen klien.
// File besar tidak pernah melewati body Vercel: browser mengunggah langsung
// ke sesi Google Drive resumable.

export type UploadProgress = {
  percent: number;
  uploaded: number;
  total: number;
  speed: number;
};

export const DB_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const DRIVE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB (batas Google Drive)
export const DRIVE_CHUNK_BYTES = 8 * 1024 * 1024; // kelipatan 256 KB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/bmp",
  "image/svg+xml",
  "application/postscript",
  "application/illustrator",
  "image/vnd.adobe.photoshop",
  "application/photoshop",
  "application/x-photoshop",
  "application/coreldraw",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/octet-stream",
]);

export const ALLOWED_EXT =
  /\.(pdf|jpe?g|png|webp|gif|tiff?|bmp|svg|ai|psd|psb|cdr|eps|zip|rar|7z|docx?|xlsx?|pptx?|txt|csv|mp4|mov|webm|heic|heif)$/i;

export const ACCEPT_ATTR =
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.bmp,.svg,.ai,.psd,.psb,.cdr,.eps,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.mov,.webm,.heic,.heif";

export function isAllowedUpload(name: string, mime?: string | null): boolean {
  return ALLOWED_EXT.test(name) || (mime ? ALLOWED_MIME.has(mime.toLowerCase()) : false);
}

/** Nama aman untuk filesystem/header, tetap mempertahankan huruf dan ekstensi. */
export function sanitizeFileName(name: string, maxLength = 180): string {
  const clean = name
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
  if (!clean) return "file";
  if (clean.length <= maxLength) return clean;

  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 && clean.length - dot <= 12 ? clean.slice(dot) : "";
  const base = ext ? clean.slice(0, dot) : clean;
  return `${base.slice(0, Math.max(1, maxLength - ext.length))}${ext}`;
}

export function timestampLabel(date = new Date()): string {
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}-${part(
    date.getHours(),
  )}${part(date.getMinutes())}${part(date.getSeconds())}`;
}

/**
 * Nama di folder produksi: [KODE]_[NamaPelanggan]_[NamaAsli].
 * Kalau kode pesanan belum ada (file diunggah sebelum order dibuat),
 * pakai timestamp supaya tetap urut dan unik.
 */
export function formatDriveFileName(input: {
  orderCode?: string | null;
  customerName?: string | null;
  originalName: string;
}): string {
  const original = sanitizeFileName(input.originalName, 130);
  const code = sanitizeFileName(input.orderCode?.trim() || `UPLOAD-${timestampLabel()}`, 40).replace(
    /\s+/g,
    "-",
  );
  const customer = sanitizeFileName(input.customerName?.trim() || "Pelanggan", 60).replace(
    /\s+/g,
    "-",
  );
  return sanitizeFileName(`${code}_${customer}_${original}`, 200);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
