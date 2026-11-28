"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

type ToastTone = "ok" | "error" | "info";
type ToastItem = {
  id: number;
  tone: ToastTone;
  text: string;
};

const MAX_VISIBLE = 3;
const DISMISS_MS = 4000;
const SWIPE_PX = 72;

let counter = 0;

export function toast(text: string, tone: ToastTone = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("intorma:toast", { detail: { text, tone } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [drag, setDrag] = useState<{ id: number; dx: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const [onlineNotice, setOnlineNotice] = useState(false);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const onlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ id: number; pointerId: number; startX: number; dx: number } | null>(null);

  useEffect(() => {
    const onOffline = () => {
      setOffline(true);
      setOnlineNotice(false);
      if (onlineTimer.current) clearTimeout(onlineTimer.current);
      onlineTimer.current = null;
    };
    const onOnline = () => {
      setOffline(false);
      setOnlineNotice(true);
      if (onlineTimer.current) clearTimeout(onlineTimer.current);
      onlineTimer.current = setTimeout(() => setOnlineNotice(false), 3000);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (onlineTimer.current) clearTimeout(onlineTimer.current);
    };
  }, []);

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (text: string, tone: ToastTone) => {
      const id = ++counter;
      // Maksimal tiga toast: pesan lama tidak menutupi CTA di layar kecil.
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, text, tone }]);
      timers.current.set(
        id,
        setTimeout(() => remove(id), DISMISS_MS),
      );
      if (tone === "error") haptic("warning");
    },
    [remove],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { text: string; tone: ToastTone };
      push(detail.text, detail.tone);
    };
    window.addEventListener("intorma:toast", handler);
    return () => {
      window.removeEventListener("intorma:toast", handler);
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, [push]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>, id: number) {
    if (!event.isPrimary || event.pointerType === "mouse") return;
    dragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, dx: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.dx = Math.max(-140, Math.min(140, event.clientX - state.startX));
    setDrag({ id: state.id, dx: state.dx });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (Math.abs(state.dx) > SWIPE_PX) remove(state.id);
  }

  // Live region harus sudah ada di DOM sebelum toast pertama disisipkan.
  return (
    <div
      data-mobile-chrome
      className="pointer-events-none fixed bottom-[var(--bottom-overlay-offset)] left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {offline && (
        <div
          role="status"
          className="toast-item pointer-events-auto flex items-center gap-2 rounded-tag-sm border border-[var(--quiet)]/45 bg-[var(--panel)] px-4 py-3 text-sm text-[var(--text)]"
        >
          <WifiOff aria-hidden className="size-4 shrink-0 text-[var(--text-3)]" />
          Sedang offline. Periksa koneksi, lalu coba lagi.
        </div>
      )}
      {onlineNotice && (
        <div
          role="status"
          className="toast-item pointer-events-auto flex items-center gap-2 rounded-tag-sm border border-accent/40 bg-[var(--panel)] px-4 py-3 text-sm text-[var(--text)]"
        >
          <Wifi aria-hidden className="size-4 shrink-0 text-accent" />
          Koneksi kembali.
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          style={drag?.id === item.id ? { transform: `translateX(${drag.dx}px)` } : undefined}
          onPointerDown={(event) => onPointerDown(event, item.id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            setDrag(null);
          }}
          className={`toast-item pointer-events-auto flex items-start gap-2 rounded-tag-sm border px-4 py-3 text-sm shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-transform ${
            item.tone === "ok"
              ? "border-[var(--accent)]/40 bg-[var(--panel)] text-[var(--text)]"
              : item.tone === "error"
                ? "border-[var(--red)]/40 bg-[var(--panel)] text-[var(--text)]"
                : "border-[var(--border)] bg-[var(--panel)] text-[var(--text)]"
          }`}
        >
          <span className="min-w-0 flex-1">{item.text}</span>
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label="Tutup notifikasi"
            className="grid size-12 shrink-0 place-items-center rounded-tag-sm text-[var(--text-3)] transition-colors hover:text-[var(--text)] sm:size-10"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
