"use client";

import { useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsApp";

type StatusPayload = {
  ok?: boolean;
  configured?: boolean;
  provider?: "openwa" | "fonnte";
  gatewayReachable?: boolean;
  sessionStatus?: string | null;
  sessionId?: string | null;
  quota?: string;
  expired?: string;
  error?: string;
};

type TestPayload = {
  ok?: boolean;
  error?: string;
  status?: number;
  provider?: "openwa" | "fonnte";
};

export type WhatsAppStatusProps = {
  provider: "openwa" | "fonnte";
  configured: boolean;
  ready: boolean;
  device: string | null;
  quota?: string;
  expired?: string;
  error?: string;
  adminNumber: string;
};

export function WhatsAppStatus(initial: WhatsAppStatusProps) {
  const [status, setStatus] = useState<WhatsAppStatusProps>(initial);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function refresh() {
    setChecking(true);
    setNote(null);
    try {
      const response = await fetch("/api/wa/test-gateway", { cache: "no-store" });
      const body = (await response.json()) as StatusPayload;
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      const ready = Boolean(
        body.configured && body.gatewayReachable && body.sessionStatus === "ready",
      );
      setStatus({
        provider: body.provider ?? status.provider,
        configured: Boolean(body.configured),
        ready,
        device: body.sessionId ?? null,
        quota: body.quota,
        expired: body.expired,
        error: body.error,
        adminNumber: status.adminNumber,
      });
      setNote({
        tone: ready ? "ok" : "error",
        text: ready
          ? "Gateway merespons dan sesi WhatsApp siap."
          : body.error || "Gateway merespons, tetapi sesi WhatsApp belum siap.",
      });
    } catch (error) {
      setNote({
        tone: "error",
        text: error instanceof Error ? error.message : "Gagal memeriksa gateway.",
      });
    } finally {
      setChecking(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setNote(null);
    try {
      const response = await fetch("/api/wa/test-gateway", { method: "POST" });
      const body = (await response.json()) as TestPayload;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `Gateway menolak pesan (HTTP ${body.status ?? response.status}).`);
      }
      setNote({ tone: "ok", text: "Pesan tes terkirim. Cek WhatsApp admin." });
    } catch (error) {
      setNote({
        tone: "error",
        text: error instanceof Error ? error.message : "Pesan tes gagal dikirim.",
      });
    } finally {
      setSending(false);
    }
  }

  const label = !status.configured
    ? "Belum diatur"
    : status.ready
      ? "Online"
      : "Gangguan";
  const tone = !status.configured
    ? "text-[var(--text-3)] border-line"
    : status.ready
      ? "text-[var(--jade)] border-[var(--jade)]/40"
      : "text-[var(--red)] border-[var(--red)]/40";

  return (
    <div className="max-w-2xl rounded-tag-lg border border-line bg-panel/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-line bg-panel-2 text-[var(--text-2)]">
            <WhatsAppIcon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Notifikasi otomatis</p>
            <p className="mono text-[11px] text-mute">
              {status.provider === "fonnte" ? "Fonnte (hosted)" : "OpenWA (self-hosted)"}
            </p>
          </div>
        </div>
        <span className={`mono rounded-full border px-2.5 py-1 text-[11px] ${tone}`}>
          {label}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-mute">Nomor device</dt>
          <dd className="mono text-ink">{status.device || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-mute">Nomor admin</dt>
          <dd className="mono text-ink">{status.adminNumber || "—"}</dd>
        </div>
        {status.provider === "fonnte" && (
          <>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-mute">Sisa kuota</dt>
              <dd className="mono text-ink">{status.quota || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-mute">Berlaku sampai</dt>
              <dd className="mono text-ink">{status.expired || "—"}</dd>
            </div>
          </>
        )}
      </dl>

      {status.error && (
        <p className="mt-4 rounded-[var(--radius)] border border-[var(--red)]/30 bg-[var(--red)]/5 px-3 py-2 text-xs leading-5 text-[var(--red)]">
          {status.error}
        </p>
      )}

      {note && (
        <p
          role="status"
          className={`mt-4 text-xs leading-5 ${note.tone === "ok" ? "text-[var(--jade)]" : "text-[var(--red)]"}`}
        >
          {note.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendTest}
          disabled={sending || !status.configured}
          className="btn-primary min-h-10 px-4 text-sm"
        >
          <Send aria-hidden className="size-4" />
          {sending ? "Mengirim…" : "Kirim tes ke admin"}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={checking}
          className="btn btn-ghost min-h-10 px-4 text-sm"
        >
          <RefreshCw aria-hidden className={`size-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Memeriksa…" : "Cek status"}
        </button>
      </div>

      {!status.configured && (
        <p className="mt-3 text-xs leading-5 text-mute">
          Isi <span className="mono">FONNTE_TOKEN</span> di environment production, lalu deploy
          ulang. Token hanya perlu diisi sekali.
        </p>
      )}
    </div>
  );
}
