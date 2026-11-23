import { createPrivateKey, sign } from "node:crypto";

// Google Drive dipakai HANYA sebagai penyimpanan file. Database tetap Neon.
// Kredensial: GOOGLE_SERVICE_ACCOUNT_JSON (isi JSON lengkap) + GOOGLE_DRIVE_FOLDER_ID.

type Credentials = { client_email: string; private_key: string };

function credentials(): Credentials | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Credentials;
    if (parsed.client_email && parsed.private_key) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function driveEnabled(): boolean {
  return Boolean(credentials() && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const creds = credentials();
  if (!creds) throw new Error("Kredensial Google belum diisi.");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

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
  if (!response.ok) throw new Error(`Gagal autentikasi Google (${response.status}).`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

export async function driveUpload(file: {
  name: string;
  mime: string;
  data: Uint8Array;
}): Promise<{ id: string; webViewLink: string | null }> {
  const token = await accessToken();
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID!;
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
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Gagal upload ke Google Drive (${response.status}). ${(await response.text()).slice(0, 160)}`);
  }
  const data = (await response.json()) as { id?: string; webViewLink?: string };
  if (!data.id) throw new Error("Google Drive tidak mengembalikan ID file.");
  return { id: data.id, webViewLink: data.webViewLink ?? null };
}

export async function driveDownload(id: string): Promise<Uint8Array> {
  const token = await accessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) throw new Error(`Gagal mengambil file dari Google Drive (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function driveDelete(id: string): Promise<void> {
  const token = await accessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
}
