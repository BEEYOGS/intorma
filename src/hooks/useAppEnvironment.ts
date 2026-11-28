"use client";

import { useEffect, useState } from "react";

const INSTALLED_FLAG = "intorma_is_installed_env";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type TauriWindow = Window & {
  Capacitor?: CapacitorBridge;
  __TAURI_INTERNALS__?: unknown;
};

export type AppEnvironment = {
  isInstalled: boolean;
  /** Hanya `display-mode: standalone/fullscreen/minimal-ui`, bukan semua app terinstal. */
  isStandalone: boolean;
  isWebView: boolean;
  isNative: boolean;
  source: "browser" | "installed" | "webview" | "twa" | "desktop";
};

function readInstalledFlag(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_FLAG) === "true";
  } catch {
    return false;
  }
}

function writeInstalledFlag() {
  try {
    window.localStorage.setItem(INSTALLED_FLAG, "true");
    window.sessionStorage.setItem(INSTALLED_FLAG, "true");
  } catch {
    /* storage bisa diblokir; deteksi lain tetap bekerja. */
  }
}

function detectInstalledSync(): AppEnvironment {
  if (typeof window === "undefined") {
    return {
      isInstalled: false,
      isStandalone: false,
      isWebView: false,
      isNative: false,
      source: "browser",
    };
  }

  const win = window as TauriWindow;
  const ua = navigator.userAgent || "";

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const twa = typeof document !== "undefined" && document.referrer.startsWith("android-app://");

  // Capacitor menyuntik window.Capacitor. Token UA ditambahkan lewat
  // capacitor.config.ts sebagai lapisan kedua bila bridge belum siap.
  const capacitor =
    win.Capacitor?.isNativePlatform?.() === true ||
    win.Capacitor?.getPlatform?.() === "android" ||
    /in\.torma-app/i.test(ua);

  // Tauri v2 tidak mengubah UA, tetapi selalu menyuntik objek internals ini.
  const desktop =
    "__TAURI_INTERNALS__" in win ||
    Boolean(win.__TAURI_INTERNALS__) ||
    /tauri/i.test(ua);

  const webview = /\bwv\b/.test(ua) || /WebView/i.test(ua) || capacitor || desktop;
  const native = capacitor || desktop;

  // Penanda dari manifest start_url (/?source=installed_app) dan dari
  // window URL native wrapper.
  const params = new URLSearchParams(window.location.search);
  if (params.get("source") === "installed_app") {
    writeInstalledFlag();
  }

  const flagLocal = readInstalledFlag();
  let flagSession = false;
  try {
    flagSession = window.sessionStorage.getItem(INSTALLED_FLAG) === "true";
  } catch {
    /* storage bisa diblokir. */
  }

  const installed = native || isStandalone || twa || webview || flagLocal || flagSession;

  let source: AppEnvironment["source"] = "browser";
  if (desktop) source = "desktop";
  else if (capacitor) source = "webview";
  else if (twa) source = "twa";
  else if (webview) source = "webview";
  else if (isStandalone) source = "installed";
  else if (installed) source = "installed";

  return {
    isInstalled: installed,
    isStandalone,
    isWebView: webview,
    isNative: native,
    source,
  };
}

/** Pengecekan sinkron untuk dipakai di luar React (mis. guard timer). */
export function isInstalledEnvironment(): boolean {
  return detectInstalledSync().isInstalled;
}

/** Tandai environment sebagai terinstal dari PWA maupun native wrapper. */
export function markInstalledEnvironment() {
  writeInstalledFlag();
  try {
    window.localStorage.setItem("intorma-install-installed", "1");
  } catch {
    /* storage bisa diblokir; deteksi runtime tetap bekerja. */
  }
}

export function useAppEnvironment(): AppEnvironment {
  const [state, setState] = useState<AppEnvironment>(() => ({
    isInstalled: false,
    isStandalone: false,
    isWebView: false,
    isNative: false,
    source: "browser",
  }));

  useEffect(() => {
    const sync = detectInstalledSync();
    setState(sync);

    // Deteksi related apps (async, best-effort).
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ platform?: string }>>;
    };
    if (typeof nav.getInstalledRelatedApps === "function") {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (Array.isArray(apps) && apps.length > 0) {
            writeInstalledFlag();
            setState((prev) =>
              prev.isNative || prev.source === "desktop"
                ? prev
                : { ...prev, isInstalled: true, source: "installed" },
            );
          }
        })
        .catch(() => undefined);
    }

    const onInstalled = () => {
      writeInstalledFlag();
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isWebView: prev.isWebView,
        source: prev.isNative || prev.source === "desktop" ? prev.source : "installed",
      }));
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return state;
}
