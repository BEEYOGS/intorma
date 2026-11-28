"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

export function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [last, setLast] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let id: number | null = null;
    const refresh = () => {
      router.refresh();
      setLast(new Date());
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const start = () => {
      if (!paused && id === null) id = window.setInterval(refresh, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden || paused) {
        stop();
        return;
      }
      refresh();
      start();
    };

    setLast(new Date());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs, paused]);

  function refreshNow() {
    haptic("tap");
    router.refresh();
    setLast(new Date());
  }

  const time = last
    ? last.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
    : null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={refreshNow}
        aria-label="Muat ulang status sekarang"
        className="inline-flex min-h-12 items-center gap-1.5 rounded-tag-sm border border-line px-2.5 text-xs text-mute transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)]"
      >
        <RefreshCw aria-hidden className="size-3" />
        {paused ? "Dijeda" : `Auto ${Math.round(intervalMs / 1000)} dtk`}
        {time ? ` · ${time}` : null}
      </button>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Lanjutkan auto-refresh" : "Jeda auto-refresh"}
        aria-pressed={paused}
        className="grid size-12 place-items-center rounded-tag-sm border border-line text-[var(--text-3)] transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)]"
      >
        {paused ? <Play aria-hidden className="size-3.5" /> : <Pause aria-hidden className="size-3.5" />}
      </button>
    </span>
  );
}
