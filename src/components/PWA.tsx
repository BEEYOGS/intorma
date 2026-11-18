"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "intorma-install-dismissed";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

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

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as InstallPrompt;
      setPrompt(installEvent);
      setShowPopup(!recentlyDismissed());
    };
    const onInstalled = () => {
      setInstalled(true);
      setShowPopup(false);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShowPopup(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* localStorage bisa diblokir; tidak masalah */
    }
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setShowPopup(false);
    setPrompt(null);
  }

  return (
    <>
      {prompt && (
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="btn-on-dark-line mt-3 min-h-10 px-4 text-sm"
        >
          Install aplikasi <span aria-hidden="true">↓</span>
        </button>
      )}

      {installed && <p className="mt-3 text-xs text-paper/50">Aplikasi sudah terpasang.</p>}

      {showPopup && (
        <div
          role="dialog"
          aria-label="Pasang aplikasi in.torma"
          className="fixed inset-x-4 bottom-24 z-50 w-auto rounded-tag-lg border border-line bg-panel p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup notifikasi"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            ✕
          </button>

          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-tag-sm" />
            <div className="min-w-0">
              <p className="eyebrow">Lebih mudah lewat aplikasi</p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Pasang in.torma</h2>
              <p className="mt-1 text-[13px] leading-5 text-mute">
                Pesan desain dan cek status pesanan langsung dari ikon di layar utama.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={install} className="btn-primary min-h-10 flex-1 px-4 text-sm">
              Install sekarang <span aria-hidden="true">↓</span>
            </button>
            <button type="button" onClick={dismiss} className="btn-ghost min-h-10 px-4 text-sm">
              Nanti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
