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

export function PaymentPoller({ code, expiresAt }: { code: string; expiresAt: string }) {
  const router = useRouter();
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    // Backoff progresif: 2s, 4s, 8s, 16s, lalu 30s. Halaman yang dibiarkan
    // terbuka tidak terus menerus memanggil server (dan Midtrans).
    function schedule() {
      const delay = Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 4));
      attempt += 1;
      timer = setTimeout(() => void check(), delay);
    }

    async function check() {
      if (done.current) return;
      try {
        const response = await fetch(`/api/payment/status?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as StatusResponse;
        if (!alive) return;
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
        // Jaringan sedang buruk; polling berikutnya akan mencoba lagi.
      } finally {
        if (alive && !done.current) schedule();
      }
    }

    schedule();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [code, router]);

  async function checkNow() {
    setChecking(true);
    try {
      const response = await fetch(`/api/payment/status?code=${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as StatusResponse;
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
      // Diamkan; pengguna bisa mencoba lagi.
    } finally {
      setChecking(false);
    }
  }

  if (paid) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-tag-sm border border-accent/35 bg-accent/[0.07] px-4 py-3">
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
      <div className="mt-4 flex items-start gap-3 rounded-tag-sm border border-[var(--warn)]/35 bg-[var(--warn)]/[0.07] px-4 py-3">
        <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--warn)]" />
        <div>
          <p className="text-sm font-semibold text-ink">Tagihan kedaluwarsa</p>
          <p className="mt-0.5 text-xs leading-5 text-mute">Muat ulang halaman untuk memilih metode lagi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-tag-sm border border-line bg-sand/50 px-4 py-3">
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
        className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-tag-sm border border-line px-2.5 text-[11px] font-semibold text-mute transition-colors hover:border-[var(--border-2)] hover:text-ink disabled:opacity-50"
      >
        {checking ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden className="size-3.5" />}
        Cek status
      </button>
    </div>
  );
}
