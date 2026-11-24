// Upload langsung dari browser ke Google Drive (resumable, chunk 8 MB).
// File tidak pernah dikirim ke Vercel, jadi tidak terkena batas body 4,5 MB.
// Kalau Drive belum aktif, otomatis fallback ke /api/upload (maksimal 4 MB).

import {
  DB_UPLOAD_MAX_BYTES,
  DRIVE_CHUNK_BYTES,
  formatBytes,
  type UploadProgress,
} from "./upload-rules";

export type { UploadProgress };

export type UploadResult = {
  id: number;
  url: string;
  name: string;
  size: number;
  mime?: string;
  storage: "drive" | "db";
};

type Options = {
  orderCode?: string;
  customerName?: string;
  uploadToken?: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
};

type InitResponse = {
  uploadUrl?: string;
  formattedFileName?: string;
  chunkSize?: number;
  drive?: boolean;
  error?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function report(
  options: Options,
  uploaded: number,
  total: number,
  startedAt: number,
): void {
  const percent = total > 0 ? Math.min(100, Math.round((uploaded / total) * 100)) : 0;
  const elapsed = Math.max(0.25, (Date.now() - startedAt) / 1000);
  options.onProgress?.({
    percent,
    uploaded,
    total,
    speed: uploaded / elapsed,
  });
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

async function uploadViaServer(file: File, options: Options): Promise<UploadResult> {
  if (file.size > DB_UPLOAD_MAX_BYTES) {
    throw new Error(
      `File ${formatBytes(file.size)} melebihi batas 4 MB karena Google Drive belum aktif. ` +
        "Aktifkan Drive atau unggah lewat link.",
    );
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = Date.now();
    const body = new FormData();
    body.set("file", file);

    const abort = () => xhr.abort();
    options.signal?.addEventListener("abort", abort, { once: true });

    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) report(options, event.loaded, event.total, startedAt);
    };
    xhr.onload = () => {
      options.signal?.removeEventListener("abort", abort);
      const data = (xhr.response ?? null) as UploadResult | { error?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data && "url" in data && data.url) {
        report(options, file.size, file.size, startedAt);
        resolve({
          id: Number(data.id ?? 0),
          url: String(data.url),
          name: String(data.name ?? file.name),
          size: Number(data.size ?? file.size),
          mime: "mime" in data ? String(data.mime ?? "") : undefined,
          storage: "db",
        });
        return;
      }
      reject(new Error(errorMessage(data, `Gagal mengunggah file (HTTP ${xhr.status}).`)));
    };
    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", abort);
      reject(new Error("Koneksi terputus saat mengunggah file."));
    };
    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", abort);
      reject(new Error("Upload dibatalkan."));
    };
    xhr.send(body);
  });
}

async function putChunk(
  uploadUrl: string,
  file: File,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw new Error("Upload dibatalkan.");
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end}/${file.size}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file.slice(start, end + 1),
        signal,
      });
      if (response.status === 200 || response.status === 201 || response.status === 308) {
        return response;
      }
      if (response.status === 404 || response.status === 410) {
        throw new Error("Sesi upload Google Drive kedaluwarsa. Coba upload ulang.");
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Google Drive sedang sibuk (HTTP ${response.status}).`);
      } else {
        const payload = await response.json().catch(() => null);
        throw new Error(errorMessage(payload, `Upload ke Google Drive gagal (HTTP ${response.status}).`));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("kedaluwarsa")) throw error;
      if (error instanceof Error && error.message.includes("tidak didukung")) throw error;
      lastError = error;
    }
    if (attempt < 2) await sleep(600 * 2 ** attempt);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Gagal mengirim bagian file ke Google Drive.");
}

async function finalizeDrive(
  driveFileId: string,
  options: Options,
): Promise<UploadResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("/api/drive/finalize-upload", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(options.uploadToken ? { "x-upload-token": options.uploadToken } : {}),
        },
        body: JSON.stringify({ driveFileId }),
        signal: options.signal,
      });
      const data = (await response.json().catch(() => null)) as
        | (UploadResult & { error?: string })
        | null;
      if (response.ok && data?.url) return data;
      if (response.status >= 500) {
        lastError = new Error(errorMessage(data, "Gagal mencatat file ke database."));
      } else {
        throw new Error(errorMessage(data, "Gagal mencatat file ke database."));
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await sleep(800 * 2 ** attempt);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("File sudah di Drive, tetapi gagal dicatat. Coba lagi.");
}

export async function uploadFileToStorage(file: File, options: Options = {}): Promise<UploadResult> {
  if (!file || file.size === 0) throw new Error("File kosong.");

  let initResponse: Response;
  try {
    initResponse = await fetch("/api/drive/init-upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.uploadToken ? { "x-upload-token": options.uploadToken } : {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        orderCode: options.orderCode || "",
        customerName: options.customerName || "",
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Tidak bisa menghubungi server upload. Cek koneksi lalu coba lagi.");
  }

  if (initResponse.status === 503) {
    const data = (await initResponse.json().catch(() => null)) as InitResponse | null;
    if (data?.drive === false) return uploadViaServer(file, options);
  }

  const init = (await initResponse.json().catch(() => null)) as InitResponse | null;
  if (!initResponse.ok || !init?.uploadUrl) {
    throw new Error(errorMessage(init, "Gagal menyiapkan upload ke Google Drive."));
  }
  const uploadUrl = init.uploadUrl;

  const configuredChunk = Number(init.chunkSize) || DRIVE_CHUNK_BYTES;
  const chunkSize = Math.max(
    256 * 1024,
    Math.floor(configuredChunk / (256 * 1024)) * 256 * 1024,
  );
  const startedAt = Date.now();
  report(options, 0, file.size, startedAt);

  let offset = 0;
  type FinalDriveFile = { id?: string; webViewLink?: string; name?: string };
  let finalFile: FinalDriveFile | null = null;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size) - 1;
    const response = await putChunk(uploadUrl, file, offset, end, options.signal);

    if (response.status === 200 || response.status === 201) {
      finalFile = (await response.json().catch(() => null)) as FinalDriveFile | null;
      offset = file.size;
      report(options, file.size, file.size, startedAt);
      break;
    }

    if (response.status !== 308) {
      throw new Error(`Upload ke Google Drive gagal (HTTP ${response.status}).`);
    }

    // Google mengirim Range berisi byte terakhir yang benar-benar diterima.
    // Pakai itu supaya chunk yang terputus di tengah tidak dilewati.
    const range = response.headers.get("range") ?? "";
    const received = Number(range.match(/bytes=\d+-(\d+)/)?.[1] ?? NaN);
    offset = Number.isFinite(received) ? received + 1 : end + 1;
    report(options, Math.min(offset, file.size), file.size, startedAt);
  }

  if (!finalFile?.id) {
    throw new Error("Google Drive tidak mengembalikan ID file setelah upload selesai.");
  }

  const result = await finalizeDrive(finalFile.id, options);
  report(options, file.size, file.size, startedAt);
  return result;
}
