"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, RefreshCw } from "lucide-react";

type StatusResponse = {
  ok?: boolean;
  paid?: boolean;
  expired?: boolean;
  pending?: boolean;
  error?: string;
};

function remainingLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}j ${pad(minutes)}m` : `${pad(minutes)}:${pad(seconds)}`;
}

export function PaymentPoller({
  code,
  expiresAt,
  accessToken,
}: {
  code: string;
  expiresAt: string;
  accessToken?: string | null;
}) {
  const router = useRouter();
  const statusUrl = `/api/payment/status?code=${encodeURIComponent(code)}${
    accessToken ? `&t=${encodeURIComponent(accessToken)}` : ""
  }`;
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const done = useRef(false);
  const expiryHandled = useRef(false);

  // Tanda final juga terlihat di judul tab saat use membuka beberapa pesanan.
  // Getar hanya bila diizinkan dan tidak dimatikan lewat intorma-haptics=0.
  useEffect(() => {
    if (!paid && !expired) return;
    const original = document.title;
    document.title = paid ? `Lunas · ${code}` : `Kedaluwarsa · ${code}`;
    try {
      if (
        window.localStorage.getItem("intorma-haptics") !== "0" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(paid ? [40, 60, 40] : 60);
      }
    } catch {
      // Abaikan bila getar tidak didukung.
    }
    return () => {
      document.title = original;
    };
  }, [paid, expired, code]);

  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    let timer: number | null = null;
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0 && !expiryHandled.current) {
        expiryHandled.current = true;
        router.refresh();
      }
    };
    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      tick();
      if (timer === null) timer = window.setInterval(tick, 1000);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [expiresAt, router]);

  useEffect(() => {
    let alive = true;
    done.current = false;
    expiryHandled.current = false;
    setPaid(false);
    setExpired(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeController: AbortController | null = null;

    // Status PENDING tetap dicek tiap 5 detik saat tab aktif. Saat tab tersembunyi,
    // timer dan request dibatalkan supaya tidak menyedot baterai/kuota.
    function schedule() {
      if (document.hidden || done.current) return;
      timer = setTimeout(() => void check(), 5_000);
    }

    async function check() {
      if (done.current || document.hidden) return;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        const response = await fetch(statusUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as StatusResponse;
        if (!alive || controller.signal.aborted) return;
        if (data.paid) {
          done.current = true;
          setPaid(true);
          router.refresh();
        } else if (data.expired) {
          done.current = true;
          setExpired(true);
          router.refresh();
        }
      } catch {
        // Jaringan buruk atau dibatalkan saat tab hidden; polling aktif berikutnya mencoba lagi.
      } finally {
        activeController = null;
        if (alive && !done.current && !document.hidden) schedule();
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        activeController?.abort();
        return;
      }
      if (alive && !done.current) void check();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      activeController?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [statusUrl, expiresAt, router]);

  async function checkNow() {
    if (done.current) return;
    setChecking(true);
    setNotice("Memeriksa status pembayaran…");
    try {
      const response = await fetch(statusUrl, {
        cache: "no-store",
      });
      const data = (await response.json()) as StatusResponse;
      if (data.paid) {
        done.current = true;
        setPaid(true);
        setNotice("Pembayaran diterima.");
        router.refresh();
      } else if (data.expired) {
        done.current = true;
        setExpired(true);
        setNotice("Tagihan kedaluwarsa.");
        router.refresh();
      } else if (data.error) {
        setNotice(data.error);
      } else {
        setNotice("Pembayaran masih menunggu.");
      }
    } catch {
      setNotice("Gagal memeriksa status. Coba lagi.");
    } finally {
      setChecking(false);
    }
  }

  if (paid) {
    return (
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-4 flex items-start gap-3 rounded-tag-sm border border-accent/35 bg-accent/[0.07] px-4 py-3">
        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-ink">Pembayaran diterima</p>
          <p className="mt-0.5 text-xs leading-5 text-mute">Memuat status terbaru…</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div role="alert" aria-atomic="true" className="mt-4 flex items-start gap-3 rounded-tag-sm border border-[var(--quiet)]/35 bg-[var(--quiet)]/[0.07] px-4 py-3">
        <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--quiet)]" />
        <div>
          <p className="text-sm font-semibold text-ink">Tagihan kedaluwarsa</p>
          <p className="mt-0.5 text-xs leading-5 text-mute">Muat ulang halaman untuk memilih metode lagi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-tag-sm border border-line bg-sand/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-ink">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          Menunggu pembayaran
        </span>
        {remaining !== null && (
          <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-mute">
            <Clock3 aria-hidden className="size-3.5" />
            {remaining > 0 ? remainingLabel(remaining) : "kedaluwarsa"}
          </span>
        )}
        <button
          type="button"
          onClick={checkNow}
          disabled={checking}
          className="ml-auto inline-flex min-h-12 items-center gap-1.5 rounded-tag-sm border border-line px-2.5 text-xs font-semibold text-mute transition-colors hover:border-[var(--border-2)] hover:text-ink disabled:opacity-50 sm:min-h-10"
        >
          {checking ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden className="size-3.5" />}
          Cek status
        </button>
      </div>
      <span
        className="sr-only"
        role={notice.startsWith("Gagal") ? "alert" : "status"}
        aria-live={notice.startsWith("Gagal") ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {notice}
      </span>
      <p className={`mt-2 text-xs leading-5 ${notice.startsWith("Gagal") || (remaining != null && remaining > 0 && remaining < 60_000) ? "text-danger" : "text-mute"}`}>
        {notice.startsWith("Gagal")
          ? notice
          : remaining != null && remaining > 0 && remaining < 60_000
            ? "Segera kedaluwarsa. Selesaikan pembayaran sekarang."
            : "Status dicek otomatis tiap 5 detik saat halaman aktif."}
      </p>
    </div>
  );
}
