"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { isInstalledEnvironment, markInstalledEnvironment, useAppEnvironment } from "@/hooks/useAppEnvironment";
import { useOverlayRegistration } from "@/hooks/useOverlayRegistration";
import { haptic } from "@/lib/haptics";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
const LATER_MS = 7 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "intorma:open-install";
const DISMISSED_KEY = "intorma-install-dismissed";
const LATER_KEY = "intorma-install-later";
const INSTALLED_KEY = "intorma-install-installed";

function readInstalledFlag(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Penolakan tegas 30 hari; "Nanti" hanya 7 hari. Flag session lama tetap dimigrasi. */
function dismissedRecently(): boolean {
  try {
    for (const [key, ttl] of [
      [DISMISSED_KEY, DISMISS_MS],
      [LATER_KEY, LATER_MS],
    ] as const) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const at = Number(raw);
        if (Number.isFinite(at) && Date.now() - at < ttl) return true;
      }
    }
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    window.localStorage.removeItem(LATER_KEY);
    window.sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* storage bisa diblokir; popup tetap tertutup untuk sesi ini. */
  }
}

function rememberLater() {
  try {
    window.localStorage.setItem(LATER_KEY, String(Date.now()));
    window.sessionStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* storage bisa diblokir; popup tetap tertutup untuk sesi ini. */
  }
}

function rememberInstalled() {
  markInstalledEnvironment();
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/** Tombol pasif di header/menu; tidak pernah membuka popup dengan sendirinya. */
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
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(isInstalledEnvironment() || readInstalledFlag() || dismissedRecently());
    setReady(true);
  }, []);

  if (!ready || env.isInstalled || hidden) return null;

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
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [popupKey, setPopupKey] = useState(0);
  const env = useAppEnvironment();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  /** Popup hanya dibuka karena klik tombol pasif, bukan auto-show. */
  const openPopup = useCallback(() => {
    if (isInstalledEnvironment() || readInstalledFlag() || dismissedRecently()) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    setShowPopup(true);
    setPopupKey((value) => value + 1);
  }, []);

  const closePopup = useCallback(() => {
    setShowPopup(false);
    rememberDismissal();
  }, []);

  useOverlayRegistration("install-popup", showPopup, closePopup);

  // Dialog pasif tetap harus bisa ditutup dengan keyboard dan mengembalikan fokus.
  useEffect(() => {
    if (!showPopup) return;
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.();
    };
  }, [showPopup, closePopup]);

  useEffect(() => {
    // Di app terinstal tidak boleh ada listener install sama sekali.
    if (isInstalledEnvironment() || readInstalledFlag()) {
      setInstalled(true);
      setReady(true);
      return;
    }

    const onPrompt = (event: Event) => {
      // Simpan prompt untuk aksi eksplisit; jangan tampilkan modal otomatis.
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      rememberInstalled();
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

    if (isInstalledEnvironment() || readInstalledFlag()) setInstalled(true);
    setReady(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [openPopup]);

  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        haptic("success");
        rememberInstalled();
        setInstalled(true);
      } else {
        rememberDismissal();
      }
    } catch {
      /* Prompt bisa dibatalkan browser; biarkan pengguna memakai panduan. */
    } finally {
      setShowPopup(false);
      setPrompt(null);
    }
  }

  if (!ready || env.isInstalled || installed) return null;

  return (
    <>
      {showPopup && (
        <div
          key={popupKey}
          ref={dialogRef}
          data-mobile-chrome
          role="dialog"
          aria-modal="true"
          aria-label="Pasang aplikasi in.torma"
          tabIndex={-1}
          className="fixed inset-x-4 bottom-[var(--bottom-overlay-offset)] z-50 w-auto overflow-hidden rounded-[var(--radius-sharp)] border border-line border-t-2 border-t-accent bg-[var(--panel-2)]/95 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md sm:bottom-6 sm:inset-x-auto sm:right-6 sm:w-[23rem]"
        >
          <div className="p-5">
            <button
              type="button"
              onClick={closePopup}
              aria-label="Tutup notifikasi"
              className="absolute right-3 top-3 grid size-12 place-items-center rounded-[var(--radius-sharp)] text-ink/45 transition-colors hover:bg-white/[0.06] hover:text-ink"
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
                <button type="button" onClick={install} className="btn btn-primary min-h-12 flex-1 px-4 text-sm sm:min-h-10">
                  Install sekarang <Download aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPopup(false);
                    rememberLater();
                  }}
                  className="btn btn-ghost min-h-12 px-4 text-sm sm:min-h-10"
                >
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
                  <a href="/install" className="btn btn-ghost min-h-12 px-4 text-sm" onClick={closePopup}>
                    Lihat panduan pasang
                  </a>
                  <a href="/download" className="btn btn-ghost min-h-12 px-4 text-sm" onClick={closePopup}>
                    Installer native
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
