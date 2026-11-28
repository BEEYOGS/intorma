import { createPrivateKey, sign } from "node:crypto";
import { sql } from "./db";

// Google Drive dipakai HANYA sebagai penyimpanan file. Database tetap Neon.
//
// Untuk Drive pribadi (Gmail biasa) WAJIB memakai OAuth user:
//   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN
// Service account tidak punya storage quota di "My Drive" (Google 403), jadi
// hanya dipakai kalau GOOGLE_DRIVE_AUTH=service_account (Shared Drive/Workspace).
// Varian GDRIVE_SERVICE_ACCOUNT / GDRIVE_FOLDER tetap didukung untuk instalasi lama.
//
// Upload file besar memakai Resumable Upload: browser mengirim chunk langsung
// ke Google, bukan lewat body API route Vercel.

type ServiceAccount = { client_email: string; private_key: string };

export type DriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string | null;
  webContentLink: string | null;
  parents?: string[];
};

/** Format lampiran yang dikirim lewat hidden field `files`. */
export type UploadedFile = { id: string; name: string; size: number; mime: string };

function serviceAccount(): ServiceAccount | null {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GDRIVE_SERVICE_ACCOUNT || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (parsed.client_email && parsed.private_key) return parsed;
  } catch {
    return null;
  }
  return null;
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken) return { clientId, clientSecret, refreshToken };
  return null;
}

function usesServiceAccount(): boolean {
  return (
    process.env.GOOGLE_DRIVE_AUTH?.trim().toLowerCase() === "service_account" ||
    Boolean(process.env.GDRIVE_SERVICE_ACCOUNT?.trim() && !oauthConfig())
  );
}

export function driveAuthMode(): "oauth" | "service_account" | "none" {
  if (oauthConfig()) return "oauth";
  if (usesServiceAccount() && serviceAccount()) return "service_account";
  return "none";
}

export function driveFolderId(): string {
  return (
    process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ||
    process.env.GDRIVE_FOLDER?.trim() ||
    ""
  );
}

/** Alias untuk alur upload lama: folder inbox tempat file masuk sebelum order dibuat. */
export const inboxFolder = (): string => driveFolderId();

export function driveEnabled(): boolean {
  return Boolean(driveFolderId() && driveAuthMode() !== "none");
}

async function googleError(response: Response, context: string): Promise<Error> {
  const text = await response.text().catch(() => "");
  let message = text.slice(0, 300);
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      error_description?: string;
    };
    if (typeof parsed.error === "string") message = parsed.error;
    else if (parsed.error?.message) message = parsed.error.message;
    else if (parsed.error_description) message = parsed.error_description;
  } catch {
    /* bukan JSON */
  }
  return new Error(`${context} (HTTP ${response.status})${message ? `: ${message}` : ""}`);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getDriveAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const oauth = oauthConfig();
  if (oauth) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw await googleError(response, "Gagal memperbarui token Google");
    const data = (await response.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  }

  if (!usesServiceAccount()) {
    throw new Error(
      "Google Drive belum memakai OAuth. Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REFRESH_TOKEN.",
    );
  }
  const creds = serviceAccount();
  if (!creds) throw new Error("Kredensial service account Google belum diisi.");

  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), createPrivateKey(creds.private_key));
  const assertion = `${unsigned}.${signature.toString("base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw await googleError(response, "Gagal autentikasi service account Google");
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

/** Versi toleran untuk endpoint yang tidak boleh menggagalkan halaman. */
export async function mintAccessToken(): Promise<string | null> {
  try {
    return await getDriveAccessToken();
  } catch {
    return null;
  }
}

/** Upload kecil (<= 4 MB) lewat multipart. Dipakai fallback dan script tes. */
export async function driveUpload(file: {
  name: string;
  mime: string;
  data: Uint8Array;
}): Promise<{ id: string; webViewLink: string | null }> {
  const token = await getDriveAccessToken();
  const folder = driveFolderId();
  if (!folder) throw new Error("Folder Google Drive belum diisi.");

  const boundary = `----intorma${Date.now().toString(36)}`;
  const metadata = JSON.stringify({
    name: file.name,
    parents: [folder],
    mimeType: file.mime || "application/octet-stream",
  });
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.mime || "application/octet-stream"}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, Buffer.from(file.data), tail]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!response.ok) throw await googleError(response, "Gagal upload ke Google Drive");
  const data = (await response.json()) as { id?: string; webViewLink?: string };
  if (!data.id) throw new Error("Google Drive tidak mengembalikan ID file.");
  return { id: data.id, webViewLink: data.webViewLink ?? null };
}

/**
 * Buat sesi resumable upload. Browser akan PUT chunk langsung ke `uploadUrl`.
 * `origin` diteruskan agar Google mengembalikan header CORS untuk origin situs.
 */
export async function driveInitResumable(file: {
  name: string;
  mime: string;
  size: number;
  origin?: string;
}): Promise<{ uploadUrl: string; name: string }> {
  const token = await getDriveAccessToken();
  const folder = driveFolderId();
  if (!folder) throw new Error("Folder Google Drive belum diisi.");
  const mime = file.mime || "application/octet-stream";

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json; charset=UTF-8",
    "x-upload-content-type": mime,
    "x-upload-content-length": String(file.size),
  };
  if (file.origin) headers.origin = file.origin;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,webContentLink&supportsAllDrives=true",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: file.name,
        mimeType: mime,
        parents: [folder],
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw await googleError(response, "Gagal membuat sesi upload Google Drive");
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Google Drive tidak mengembalikan URL sesi upload.");
  return { uploadUrl, name: file.name };
}

export async function driveFileMeta(id: string): Promise<DriveFileMeta> {
  const token = await getDriveAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}` +
      "?fields=id,name,mimeType,size,webViewLink,webContentLink,parents&supportsAllDrives=true",
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw await googleError(response, "Gagal membaca metadata file Drive");
  const data = (await response.json()) as Partial<DriveFileMeta> & { size?: string };
  if (!data.id) throw new Error("Google Drive tidak mengembalikan ID file.");
  return {
    id: data.id,
    name: data.name ?? data.id,
    mimeType: data.mimeType ?? "application/octet-stream",
    size: Number(data.size ?? 0),
    webViewLink: data.webViewLink ?? null,
    webContentLink: data.webContentLink ?? null,
    parents: data.parents,
  };
}

/** Response mentah dari Drive, bisa dipakai untuk streaming dan Range request. */
export async function driveDownloadResponse(id: string, range?: string | null): Promise<Response> {
  const token = await getDriveAccessToken();
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (range) headers.range = range;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
    {
      headers,
      signal: AbortSignal.timeout(10 * 60_000),
    },
  );
  if (!response.ok && response.status !== 206) {
    throw await googleError(response, "Gagal mengambil file dari Google Drive");
  }
  return response;
}

export async function driveDownload(id: string): Promise<Uint8Array> {
  const response = await driveDownloadResponse(id);
  return new Uint8Array(await response.arrayBuffer());
}

export async function driveDelete(id: string): Promise<void> {
  const token = await getDriveAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok && response.status !== 404) {
    throw await googleError(response, "Gagal menghapus file dari Google Drive");
  }
}

async function driveApi(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: any } | null> {
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return null;
  const text = await response.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  return { status: response.status, data };
}

async function ensureOrderFolder(token: string, code: string): Promise<string | null> {
  const inbox = inboxFolder();
  if (!inbox) return null;
  const safeCode = code.replace(/['\\]/g, "''").slice(0, 120);
  const safeInbox = inbox.replace(/['\\]/g, "''").slice(0, 500);
  const query = encodeURIComponent(
    `name = '${safeCode}' and '${safeInbox}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const found = await driveApi(token, `/files?q=${query}&fields=files(id)&pageSize=1`);
  const existing = found?.data?.files?.[0]?.id as string | undefined;
  if (existing) return existing;

  const created = await driveApi(token, `/files?supportsAllDrives=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: code,
      mimeType: "application/vnd.google-apps.folder",
      parents: [inbox],
    }),
  });
  return (created?.data?.id as string | undefined) ?? null;
}

/** Pindahkan file hasil unggahan ke folder pesanan dan catat di database. */
export async function attachOrderFiles(
  orderId: number,
  code: string,
  files: UploadedFile[],
): Promise<void> {
  if (!files.length || !driveEnabled()) return;
  const token = await mintAccessToken();
  if (!token) return;

  const folder = await ensureOrderFolder(token, code);
  for (const file of files) {
    try {
      const check = await driveApi(token, `/files/${encodeURIComponent(file.id)}?fields=id,size`);
      if (!check || check.status !== 200 || !check.data?.id) continue;
      const params = new URLSearchParams({ supportsAllDrives: "true" });
      if (folder) {
        params.set("addParents", folder);
        params.set("removeParents", inboxFolder());
      }
      await driveApi(token, `/files/${encodeURIComponent(file.id)}?${params}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      await sql`
        insert into order_files (order_id, name, size, mime, drive_id)
        values (${orderId}, ${file.name.slice(0, 200)}, ${file.size}, ${file.mime || null}, ${file.id})`;
    } catch {
      // File tetap aman di inbox; jangan gagalkan order karena Drive bermasalah.
    }
  }
}
