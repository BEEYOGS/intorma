"use client";

import { useEffect, useRef, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const POPUP_MS = 15_000;

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [installed, setInstalled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowPopup(false), POPUP_MS);
  }

  function hidePopup() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShowPopup(false);
  }

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setShowPopup(true);
      startTimer();
    };
    const onInstalled = () => {
      setInstalled(true);
      hidePopup();
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    hidePopup();
    setPrompt(null);
  }

  return (
    <>
      {prompt && (
        <button
          type="button"
          onClick={() => {
            setShowPopup(true);
            startTimer();
          }}
          className="btn-on-dark-line mt-3 min-h-10 px-4 text-sm"
        >
          Install aplikasi <span aria-hidden="true">↓</span>
        </button>
      )}

      {installed && <p className="mt-3 text-xs text-mute">Aplikasi sudah terpasang.</p>}

      {showPopup && (
        <div
          role="dialog"
          aria-label="Pasang aplikasi in.torma"
          className="fixed inset-x-4 bottom-24 z-50 w-auto overflow-hidden rounded-tag-lg border border-line bg-panel shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]"
        >
          <div className="p-5">
            <button
              type="button"
              onClick={hidePopup}
              aria-label="Tutup notifikasi"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink/45 transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              ✕
            </button>

            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" className="size-12 shrink-0 rounded-tag-sm bg-[#f4f1ea] p-1" />
              <div className="min-w-0">
                <p className="eyebrow">Lebih mudah lewat aplikasi</p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Pasang in.torma</h2>
                <p className="mt-1 text-[13px] leading-5 text-mute">
                  Pesan desain dan cek status pesanan langsung dari ikon di layar utama.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={install} className="btn btn-primary min-h-10 flex-1 px-4 text-sm">
                Install sekarang <span aria-hidden="true">↓</span>
              </button>
              <button type="button" onClick={hidePopup} className="btn btn-ghost min-h-10 px-4 text-sm">
                Nanti
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="h-0.5 bg-line">
            <div className="h-full bg-accent install-timer" />
          </div>
        </div>
      )}
    </>
  );
}
