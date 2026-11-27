"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { isInstalledEnvironment, useAppEnvironment } from "@/hooks/useAppEnvironment";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";
type StorageScope = "session" | "local";

const POPUP_MS = 15_000;
const AUTO_SHOW_MS = 3_000;
const OPEN_EVENT = "intorma:open-install";
const DISMISSED_KEY = "intorma-install-dismissed";
const INSTALLED_KEY = "intorma-install-installed";

function readFlag(key: string, scope: StorageScope): boolean {
  try {
    const store = scope === "session" ? window.sessionStorage : window.localStorage;
    return store.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, scope: StorageScope) {
  try {
    const store = scope === "session" ? window.sessionStorage : window.localStorage;
    store.setItem(key, "1");
  } catch {
    /* storage bisa diblokir; popup tetap berfungsi untuk sesi ini. */
  }
}

// Deteksi multi-lapis dipusatkan di useAppEnvironment / isInstalledEnvironment.

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

/** Tombol kecil untuk header/menu/halaman; membuka popup install global. */
export function InstallNavButton({
  className = "",
  label = "Install aplikasi",
  iconClassName = "size-3.5 shrink-0 opacity-70",
  onOpen,
}: {
  className?: string;
  label?: string;
  iconClassName?: string;
  onOpen?: () => void;
}) {
  const env = useAppEnvironment();
  if (env.isInstalled) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        window.dispatchEvent(new Event(OPEN_EVENT));
      }}
      className={className}
      aria-label={label}
    >
      <Download aria-hidden className={iconClassName} />
      {label}
    </button>
  );
}

export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [popupKey, setPopupKey] = useState(0);
  const env = useAppEnvironment();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const openPopup = useCallback(() => {
    if (isInstalledEnvironment() || readFlag(INSTALLED_KEY, "local")) {
      setInstalled(true);
      return;
    }
    clearTimer();
    setShowPopup(true);
    setPopupKey((value) => value + 1);
    timer.current = setTimeout(() => setShowPopup(false), POPUP_MS);
  }, [clearTimer]);

  const closePopup = useCallback(() => {
    clearTimer();
    setShowPopup(false);
    writeFlag(DISMISSED_KEY, "session");
  }, [clearTimer]);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      if (!readFlag(DISMISSED_KEY, "session")) openPopup();
    };
    const onInstalled = () => {
      clearTimer();
      writeFlag(INSTALLED_KEY, "local");
      setInstalled(true);
      setShowPopup(false);
      setPrompt(null);
    };
    const onOpen = () => openPopup();

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_EVENT, onOpen);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const android = /android/i.test(navigator.userAgent);
    setPlatform(ios ? "ios" : android ? "android" : "desktop");

    if (!isInstalledEnvironment() && !readFlag(INSTALLED_KEY, "local") && !readFlag(DISMISSED_KEY, "session")) {
      timer.current = setTimeout(openPopup, AUTO_SHOW_MS);
    } else if (isInstalledEnvironment() || readFlag(INSTALLED_KEY, "local")) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_EVENT, onOpen);
      clearTimer();
    };
  }, [clearTimer, openPopup]);

  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        writeFlag(INSTALLED_KEY, "local");
        setInstalled(true);
      } else {
        writeFlag(DISMISSED_KEY, "session");
      }
    } catch {
      /* Prompt bisa dibatalkan browser; biarkan pengguna memakai panduan. */
    } finally {
      clearTimer();
      setShowPopup(false);
      setPrompt(null);
    }
  }

  if (env.isInstalled) return null;

  return (
    <>
      {installed && (
        <span className="sr-only" role="status">
          Aplikasi in.torma sudah terpasang.
        </span>
      )}

      {showPopup && (
        <div
          key={popupKey}
          role="dialog"
          aria-label="Pasang aplikasi in.torma"
          className="fixed inset-x-4 bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] z-50 w-auto overflow-hidden rounded-[var(--radius-sharp)] border border-line border-t-2 border-t-accent bg-[var(--panel-2)]/95 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md sm:inset-x-auto sm:right-6 sm:w-[23rem]"
        >
          <div className="p-5">
            <button
              type="button"
              onClick={closePopup}
              aria-label="Tutup notifikasi"
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-[var(--radius-sharp)] text-ink/45 transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sharp)] border border-accent/30 bg-accent/[0.06] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg?v=4" alt="" aria-hidden="true" className="size-full" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="eyebrow">PWA · in.torma</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Pasang in.torma</h2>
                <p className="mt-1 text-[13px] leading-5 text-mute">
                  Pesan desain dan cek status pesanan langsung dari ikon di layar utama.
                </p>
              </div>
            </div>

            {prompt ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={install} className="btn btn-primary min-h-10 flex-1 px-4 text-sm">
                  Install sekarang <Download aria-hidden className="size-4" />
                </button>
                <button type="button" onClick={closePopup} className="btn btn-ghost min-h-10 px-4 text-sm">
                  Nanti
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3" aria-live="polite">
                <p className="rounded-[var(--radius-sharp)] border border-line bg-[var(--panel)] px-3 py-2.5 text-[12px] leading-5 text-mute">
                  {platform === "ios" ? (
                    <>
                      Di iPhone/iPad: ketuk <span className="font-semibold text-ink">Share</span> lalu pilih{" "}
                      <span className="font-semibold text-ink">Add to Home Screen</span>.
                    </>
                  ) : platform === "android" ? (
                    <>
                      Di Chrome Android: ketuk menu <span className="font-semibold text-ink">⋮</span> lalu pilih{" "}
                      <span className="font-semibold text-ink">Install app</span>.
                    </>
                  ) : (
                    <>
                      Di Chrome/Edge desktop: klik ikon install di address bar, atau menu{" "}
                      <span className="font-semibold text-ink">Install in.torma</span>.
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href="/install" className="btn btn-ghost min-h-10 px-4 text-sm" onClick={closePopup}>
                    Lihat panduan pasang
                  </a>
                  <a href="/download" className="btn btn-ghost min-h-10 px-4 text-sm" onClick={closePopup}>
                    Installer native
                  </a>
                </div>
              </div>
            )}
          </div>

          <div aria-hidden="true" className="h-0.5 bg-line">
            <div className="h-full bg-accent install-timer" />
          </div>
        </div>
      )}
    </>
  );
}
