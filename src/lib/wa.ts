import { normalizeWA } from "./format";
import { sql } from "./db";

const MAX_LENGTH = 4000;

export function gatewayBase(): string {
  return (process.env.OPENWA_BASE_URL || process.env.OPENWA_URL || "").trim().replace(/\/+$/, "");
}

export function gatewayKey(): string {
  return (process.env.OPENWA_API_KEY || process.env.OPENWA_KEY || "").trim();
}

export function sessionName(): string {
  return process.env.OPENWA_SESSION?.trim() || "intorma";
}

export function adminWhatsApp(): string {
  return (process.env.ADMIN_WHATSAPP_NUMBER || process.env.ADMIN_WA || "").trim();
}

export function gatewayConfigured(): boolean {
  return Boolean(gatewayBase() && gatewayKey());
}

export type WAProvider = "openwa" | "fonnte" | "cloud";

const FONNTE_BASE = "https://api.fonnte.com";
const META_GRAPH_BASE = "https://graph.facebook.com";

function fonnteToken(): string {
  return (process.env.FONNTE_TOKEN || "").trim();
}

function metaToken(): string {
  return (process.env.META_WA_TOKEN || "").trim();
}

function metaPhoneId(): string {
  return (process.env.META_WA_PHONE_ID || "").trim();
}

function metaVersion(): string {
  return (process.env.META_WA_VERSION || "v26.0").trim();
}

function cloudConfigured(): boolean {
  return Boolean(metaToken() && metaPhoneId());
}

/**
 * Provider hosted lebih dulu. OpenWA tetap dipakai sebagai fallback supaya
 * instalasi lama tidak langsung rusak. Atur WA_PROVIDER=cloud untuk memakai
 * Meta WhatsApp Cloud API (tanpa watermark pihak ketiga).
 */
export function waProvider(): WAProvider {
  const configured = (process.env.WA_PROVIDER || "").trim().toLowerCase();
  if (configured === "cloud" || configured === "fonnte" || configured === "openwa") return configured;
  if (cloudConfigured()) return "cloud";
  return fonnteToken() ? "fonnte" : "openwa";
}

export function waConfigured(): boolean {
  const provider = waProvider();
  if (provider === "cloud") return cloudConfigured();
  if (provider === "fonnte") return Boolean(fonnteToken());
  return gatewayConfigured();
}

type SessionRow = { id?: string; name?: string; status?: string };

type SessionLookup = {
  reachable: boolean;
  httpStatus: number;
  latencyMs: number;
  session: SessionRow | null;
  error?: string;
};

async function lookupSession(timeoutMs = 5000): Promise<SessionLookup> {
  const base = gatewayBase();
  const key = gatewayKey();
  const startedAt = Date.now();
  if (!base || !key) {
    return {
      reachable: false,
      httpStatus: 0,
      latencyMs: 0,
      session: null,
      error: "OPENWA_BASE_URL/OPENWA_API_KEY belum diisi.",
    };
  }

  try {
    const response = await fetch(`${base}/api/sessions?name=${encodeURIComponent(sessionName())}`, {
      headers: { "x-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - startedAt;
    const text = await response.text().catch(() => "");
    let list: SessionRow[] = [];
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) list = parsed as SessionRow[];
    } catch {
      /* bukan JSON */
    }
    const configured = sessionName();
    const session =
      list.find((row) => row.name === configured) ||
      list.find((row) => row.id === configured) ||
      null;
    return {
      reachable: true,
      httpStatus: response.status,
      latencyMs,
      session,
      error: response.ok
        ? session
          ? undefined
          : `Sesi "${configured}" tidak ditemukan di gateway.`
        : `Gateway merespons HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      reachable: false,
      httpStatus: 0,
      latencyMs: Date.now() - startedAt,
      session: null,
      error: error instanceof Error ? error.message : "Gateway tidak bisa dihubungi.",
    };
  }
}

type FonnteDevice = {
  status?: boolean;
  device?: string;
  device_status?: string;
  expired?: string;
  quota?: string;
  reason?: string;
};

type FonnteLookup = {
  reachable: boolean;
  httpStatus: number;
  latencyMs: number;
  device: FonnteDevice | null;
  error?: string;
};

async function lookupFonnte(timeoutMs = 5000): Promise<FonnteLookup> {
  const token = fonnteToken();
  const startedAt = Date.now();
  if (!token) {
    return {
      reachable: false,
      httpStatus: 0,
      latencyMs: 0,
      device: null,
      error: "FONNTE_TOKEN belum diisi.",
    };
  }

  try {
    const response = await fetch(`${FONNTE_BASE}/device`, {
      method: "POST",
      headers: { Authorization: token },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text().catch(() => "");
    let device: FonnteDevice | null = null;
    try {
      device = text ? (JSON.parse(text) as FonnteDevice) : null;
    } catch {
      /* bukan JSON */
    }
    const ok = response.ok && device?.status === true;
    return {
      reachable: true,
      httpStatus: response.status,
      latencyMs: Date.now() - startedAt,
      device,
      error: ok
        ? undefined
        : device?.reason || `Fonnte merespons HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      reachable: false,
      httpStatus: 0,
      latencyMs: Date.now() - startedAt,
      device: null,
      error: error instanceof Error ? error.message : "Fonnte tidak bisa dihubungi.",
    };
  }
}

async function sendFonnte(number: string, content: string): Promise<WASendResult> {
  const token = fonnteToken();
  const startedAt = Date.now();
  if (!token) {
    return {
      ok: false,
      configured: false,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: 0,
      status: 0,
      phone: number,
      error: "FONNTE_TOKEN belum diisi.",
      provider: "fonnte",
    };
  }

  try {
    const response = await fetch(`${FONNTE_BASE}/send`, {
      method: "POST",
      headers: {
        Authorization: token,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: number,
        message: content.slice(0, MAX_LENGTH),
        countryCode: "0",
        // Pesan tetap disimpan Fonnte kalau device sedang reconnect.
        connectOnly: "false",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text().catch(() => "");
    type FonnteSendResponse = { status?: boolean; reason?: string; detail?: string };
    let body: FonnteSendResponse | null = null;
    try {
      body = text ? (JSON.parse(text) as FonnteSendResponse) : null;
    } catch {
      /* bukan JSON */
    }
    const ok = response.ok && body?.status === true;
    return {
      ok,
      configured: true,
      gatewayReachable: true,
      sessionStatus: ok ? "ready" : null,
      latencyMs: Date.now() - startedAt,
      status: response.status,
      phone: number,
      error: ok ? undefined : body?.reason || body?.detail || `Fonnte menolak pesan (HTTP ${response.status}).`,
      gatewayResponse: text.slice(0, 500),
      provider: "fonnte",
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: Date.now() - startedAt,
      status: 0,
      phone: number,
      error: error instanceof Error ? error.message : "Gagal menghubungi Fonnte.",
      provider: "fonnte",
    };
  }
}

async function sendCloud(number: string, content: string): Promise<WASendResult> {
  const startedAt = Date.now();
  const token = metaToken();
  const phoneId = metaPhoneId();

  try {
    const response = await fetch(`${META_GRAPH_BASE}/${metaVersion()}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: number,
        type: "text",
        text: { preview_url: false, body: content.slice(0, MAX_LENGTH) },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text().catch(() => "");
    type CloudError = { error?: { message?: string; code?: number } };
    let parsed: CloudError | null = null;
    try {
      parsed = text ? (JSON.parse(text) as CloudError) : null;
    } catch {
      /* bukan JSON */
    }
    const ok = response.ok && !parsed?.error;
    const detail = parsed?.error?.message || `Meta menolak pesan (HTTP ${response.status}).`;
    const hint =
      parsed?.error?.code === 131047
        ? " Pesan teks hanya boleh dikirim dalam 24 jam setelah pelanggan membalas; di luar itu pakai template yang disetujui Meta."
        : "";

    return {
      ok,
      configured: true,
      gatewayReachable: response.status > 0,
      sessionStatus: ok ? "ready" : null,
      latencyMs: Date.now() - startedAt,
      status: response.status,
      phone: number,
      error: ok ? undefined : `${detail}${hint}`,
      gatewayResponse: text.slice(0, 500),
      provider: "cloud",
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: Date.now() - startedAt,
      status: 0,
      phone: number,
      error: error instanceof Error ? error.message : "Gagal menghubungi Meta Cloud API.",
      provider: "cloud",
    };
  }
}

export type WASendResult = {
  ok: boolean;
  configured: boolean;
  gatewayReachable: boolean;
  sessionStatus: string | null;
  latencyMs: number;
  status: number;
  phone?: string;
  error?: string;
  gatewayResponse?: string;
  provider?: WAProvider;
};

/** Kirim langsung tanpa fallback antrean. Dipakai endpoint tes & diagnostik. */
export async function waSendTest(to: string, content: string): Promise<WASendResult> {
  const provider = waProvider();
  const number = normalizeWA(to);
  const startedAt = Date.now();
  if (!waConfigured()) {
    const missing: Record<WAProvider, string> = {
      cloud: "META_WA_TOKEN dan META_WA_PHONE_ID belum diisi di environment production.",
      fonnte: "FONNTE_TOKEN belum diisi di environment production.",
      openwa: "Gateway WhatsApp belum dikonfigurasi. Isi OPENWA_BASE_URL dan OPENWA_API_KEY di environment.",
    };
    return {
      ok: false,
      configured: false,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: 0,
      status: 0,
      error: missing[provider],
      provider,
    };
  }
  if (!number) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: 0,
      status: 0,
      error: "Nomor WhatsApp tidak valid.",
      provider,
    };
  }
  if (!content.trim()) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: false,
      sessionStatus: null,
      latencyMs: 0,
      status: 0,
      error: "Pesan kosong.",
      provider,
    };
  }

  if (provider === "cloud") return sendCloud(number, content);
  if (provider === "fonnte") return sendFonnte(number, content);

  const lookup = await lookupSession(5000);
  if (!lookup.reachable || !lookup.session?.id) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: lookup.reachable,
      sessionStatus: lookup.session?.status ?? null,
      latencyMs: lookup.latencyMs,
      status: lookup.httpStatus,
      phone: number,
      error: lookup.error ?? "Sesi WhatsApp tidak ditemukan.",
      provider,
    };
  }
  if (lookup.session.status !== "ready") {
    return {
      ok: false,
      configured: true,
      gatewayReachable: true,
      sessionStatus: lookup.session.status ?? null,
      latencyMs: lookup.latencyMs,
      status: lookup.httpStatus,
      phone: number,
      error: `Sesi WhatsApp belum ready (status: ${lookup.session.status ?? "unknown"}).`,
      provider,
    };
  }

  const base = gatewayBase();
  const key = gatewayKey();
  try {
    const response = await fetch(
      `${base}/api/sessions/${encodeURIComponent(lookup.session.id)}/messages/send-text`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key },
        body: JSON.stringify({ chatId: `${number}@c.us`, text: content.slice(0, MAX_LENGTH) }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
    const body = await response.text().catch(() => "");
    return {
      ok: response.ok,
      configured: true,
      gatewayReachable: true,
      sessionStatus: lookup.session.status ?? null,
      latencyMs: Date.now() - startedAt,
      status: response.status,
      phone: number,
      error: response.ok ? undefined : `Gateway menolak pesan (HTTP ${response.status}).`,
      gatewayResponse: body.slice(0, 500),
      provider,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      gatewayReachable: true,
      sessionStatus: lookup.session.status ?? null,
      latencyMs: Date.now() - startedAt,
      status: 0,
      phone: number,
      error: error instanceof Error ? error.message : "Gagal menghubungi gateway.",
      provider,
    };
  }
}

export type WADiagnostics = {
  configured: boolean;
  provider: WAProvider;
  baseUrl: string;
  sessionName: string;
  gatewayReachable: boolean;
  sessionStatus: string | null;
  sessionId: string | null;
  latencyMs: number;
  httpStatus: number;
  quota?: string;
  expired?: string;
  error?: string;
};

export async function waDiagnostics(): Promise<WADiagnostics> {
  const provider = waProvider();

  if (provider === "cloud") {
    const baseUrl = `${META_GRAPH_BASE}/${metaVersion()}`;
    if (!cloudConfigured()) {
      return {
        configured: false,
        provider,
        baseUrl,
        sessionName: metaPhoneId() || "cloud",
        gatewayReachable: false,
        sessionStatus: null,
        sessionId: null,
        latencyMs: 0,
        httpStatus: 0,
        error: "META_WA_TOKEN dan META_WA_PHONE_ID belum diisi.",
      };
    }
    const startedAt = Date.now();
    try {
      const response = await fetch(
        `${baseUrl}/${encodeURIComponent(metaPhoneId())}?fields=verified_name`,
        {
          headers: { Authorization: `Bearer ${metaToken()}` },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      const text = await response.text().catch(() => "");
      let row: { verified_name?: string } | null = null;
      try {
        row = text ? (JSON.parse(text) as { verified_name?: string }) : null;
      } catch {
        /* bukan JSON */
      }
      return {
        configured: true,
        provider,
        baseUrl,
        sessionName: row?.verified_name ?? metaPhoneId(),
        gatewayReachable: response.ok,
        sessionStatus: response.ok ? "ready" : null,
        sessionId: metaPhoneId(),
        latencyMs: Date.now() - startedAt,
        httpStatus: response.status,
        error: response.ok ? undefined : text.slice(0, 300) || `Meta merespons HTTP ${response.status}.`,
      };
    } catch (error) {
      return {
        configured: true,
        provider,
        baseUrl,
        sessionName: metaPhoneId(),
        gatewayReachable: false,
        sessionStatus: null,
        sessionId: metaPhoneId(),
        latencyMs: Date.now() - startedAt,
        httpStatus: 0,
        error: error instanceof Error ? error.message : "Meta Cloud API tidak bisa dihubungi.",
      };
    }
  }

  if (provider === "fonnte") {
    if (!fonnteToken()) {
      return {
        configured: false,
        provider,
        baseUrl: FONNTE_BASE,
        sessionName: "fonnte",
        gatewayReachable: false,
        sessionStatus: null,
        sessionId: null,
        latencyMs: 0,
        httpStatus: 0,
        error: "FONNTE_TOKEN belum diisi.",
      };
    }
    const lookup = await lookupFonnte(5000);
    const connected = lookup.device?.device_status === "connect";
    return {
      configured: true,
      provider,
      baseUrl: FONNTE_BASE,
      sessionName: lookup.device?.device ?? "fonnte",
      gatewayReachable: lookup.reachable,
      sessionStatus: connected ? "ready" : lookup.device?.device_status ?? null,
      sessionId: lookup.device?.device ?? null,
      latencyMs: lookup.latencyMs,
      httpStatus: lookup.httpStatus,
      quota: lookup.device?.quota,
      expired: lookup.device?.expired,
      error: lookup.error,
    };
  }

  const base = gatewayBase();
  if (!gatewayConfigured()) {
    return {
      configured: false,
      provider,
      baseUrl: base,
      sessionName: sessionName(),
      gatewayReachable: false,
      sessionStatus: null,
      sessionId: null,
      latencyMs: 0,
      httpStatus: 0,
      error:
        "Gateway WhatsApp belum dikonfigurasi. Isi OPENWA_BASE_URL dan OPENWA_API_KEY.",
    };
  }
  const lookup = await lookupSession(5000);
  return {
    configured: true,
    provider,
    baseUrl: base,
    sessionName: sessionName(),
    gatewayReachable: lookup.reachable,
    sessionStatus: lookup.session?.status ?? null,
    sessionId: lookup.session?.id ?? null,
    latencyMs: lookup.latencyMs,
    httpStatus: lookup.httpStatus,
    error: lookup.error,
  };
}

async function enqueue(to: string, content: string): Promise<boolean> {
  try {
    const number = normalizeWA(to);
    if (!number) return false;
    await sql`insert into wa_outbox (to_number, content) values (${number}, ${content.slice(0, MAX_LENGTH)})`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Kirim WA dan tunggu hasilnya. Kalau gateway tidak bisa dijangkau dari Vercel,
 * pesan tetap masuk antrean database dan dikirim oleh `npm run wa:agent`.
 * Semua langkah di-await supaya tidak dibunuh setelah response serverless.
 */
export async function sendWA(to: string, content: string): Promise<boolean> {
  const number = normalizeWA(to);
  if (!number || !content.trim()) return false;

  if (waConfigured()) {
    const result = await waSendTest(number, content);
    if (result.ok) return true;
    console.warn(
      `[wa] ${result.provider ?? waProvider()} gagal (${result.status || "network"}): ${result.error ?? "unknown"}; masuk antrean database.`,
    );
  }
  return enqueue(to, content);
}

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://intorma-psi.vercel.app";
