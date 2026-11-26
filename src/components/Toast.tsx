"use client";

import { useCallback, useEffect, useState } from "react";

type ToastItem = {
  id: number;
  tone: "ok" | "error" | "info";
  text: string;
};

let counter = 0;

export function toast(text: string, tone: ToastItem["tone"] = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("intorma:toast", { detail: { text, tone } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((text: string, tone: ToastItem["tone"]) => {
    const id = ++counter;
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text: string; tone: ToastItem["tone"] };
      push(detail.text, detail.tone);
    };
    window.addEventListener("intorma:toast", handler);
    return () => window.removeEventListener("intorma:toast", handler);
  }, [push]);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          aria-live={t.tone === "error" ? "assertive" : "polite"}
          className={`pointer-events-auto rounded-tag-sm border px-4 py-3 text-sm shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm toast-item ${
            t.tone === "ok"
              ? "border-[var(--jade)]/40 bg-[var(--panel)] text-[var(--text)]"
              : t.tone === "error"
                ? "border-[var(--red)]/40 bg-[var(--panel)] text-[var(--text)]"
                : "border-[var(--border)] bg-[var(--panel)] text-[var(--text)]"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}