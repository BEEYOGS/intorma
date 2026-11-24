import crypto from "node:crypto";
import { sql } from "./db";

/**
 * Integrasi Google Drive via Service Account (GDRIVE_SERVICE_ACCOUNT).
 *
 * Browser mengunggah langsung ke Drive (resumable) memakai token akses
 * pendek yang dicetak di sini, jadi file besar tidak pernah melewati
 * serverless Vercel (batas body 4,5 MB) sama sekali. Server hanya memindahkan
 * file dari folder inbox ke folder per pesanan setelah order tersimpan.
 */

export type UploadedFile = { id: string; name: string; size: number; mime: string };

type SA = { client_email: string; private_key: string };

export const driveEnabled = () => Boolean(process.env.GDRIVE_SERVICE_ACCOUNT?.trim() && process.env.GDRIVE_FOLDER?.trim());
export const inboxFolder = () => (process.env.GDRIVE_FOLDER ?? "").trim();

let cached: { token: string; at: number } | null = null;

function serviceAccount(): SA | null {
  const raw = process.env.GDRIVE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j.client_email || !j.private_key) return null;
    return { client_email: j.client_email, private_key: j.private_key };
  } catch {
    return null;
  }
}

const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Cetak access token service account (cache ±50 menit, masa berlaku 1 jam). */
export async function mintAccessToken(): Promise<string | null> {
  const sa = serviceAccount();
  if (!sa) return null;
  if (cached && Date.now() - cached.at < 50 * 60_000) return cached.token;
  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/drive.file",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key);
  const jwt = `${unsigned}.${b64url(sig)}`;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) return null;
    cached = { token: data.access_token, at: Date.now() };
    return data.access_token;
  } catch {
    return null;
  }
}

async function driveApi(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 204) return null;
  const text = await res.text();
  try {
    return { status: res.status, data: text ? JSON.parse(text) : null };
  } catch {
    return { status: res.status, data: null };
  }
}

async function ensureOrderFolder(token: string, code: string): Promise<string | null> {
  const inbox = inboxFolder();
  if (!inbox) return null;
  const q = encodeURIComponent(`name = '${code}' and '${inbox}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const found = await driveApi(token, `/files?q=${q}&fields=files(id)&pageSize=1`);
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
export async function attachOrderFiles(orderId: number, code: string, files: UploadedFile[]) {
  if (!files.length || !driveEnabled()) return;
  const token = await mintAccessToken();
  if (!token) return;

  const folder = await ensureOrderFolder(token, code);
  for (const file of files) {
    try {
      const check = await driveApi(token, `/files/${file.id}?fields=id,size`, {});
      if (!check || check.status !== 200 || !check.data?.id) continue;
      const target = folder ? { addParents: [folder], removeParents: [inboxFolder()] } : {};
      await driveApi(token, `/files/${file.id}?supportsAllDrives=true`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target),
      });
      await sql`
        insert into order_files (order_id, name, size, mime, drive_id)
        values (${orderId}, ${file.name.slice(0, 200)}, ${file.size}, ${file.mime || null}, ${file.id})`;
    } catch {
      // File tetap aman di inbox; jangan gagalkan order karena Drive bermasalah.
    }
  }
}
