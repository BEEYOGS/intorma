"use client";

import { useEffect, useState } from "react";

const INSTALLED_FLAG = "intorma_is_installed_env";

export type AppEnvironment = {
  isInstalled: boolean;
  isStandalone: boolean;
  isWebView: boolean;
  source: "browser" | "installed" | "webview" | "twa";
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

function detectInstalledSync(): { installed: boolean; webview: boolean; source: AppEnvironment["source"] } {
  if (typeof window === "undefined") {
    return { installed: false, webview: false, source: "browser" };
  }

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const twa = typeof document !== "undefined" && document.referrer.startsWith("android-app://");
  const webview = /\bwv\b/.test(navigator.userAgent) || /WebView/i.test(navigator.userAgent);

  // Penanda dari manifest start_url (/?source=installed_app).
  const params = new URLSearchParams(window.location.search);
  if (params.get("source") === "installed_app") {
    writeInstalledFlag();
  }

  const flagLocal = readInstalledFlag();
  const flagSession =
    (() => {
      try {
        return window.sessionStorage.getItem(INSTALLED_FLAG) === "true";
      } catch {
        return false;
      }
    })();

  const installed = standalone || twa || webview || flagLocal || flagSession;

  let source: AppEnvironment["source"] = "browser";
  if (twa) source = "twa";
  else if (webview) source = "webview";
  else if (installed) source = "installed";

  return { installed, webview, source };
}

/** Pengecekan sinkron untuk dipakai di luar React (mis. guard timer). */
export function isInstalledEnvironment(): boolean {
  return detectInstalledSync().installed;
}

export function useAppEnvironment(): AppEnvironment {
  const [state, setState] = useState<AppEnvironment>(() => ({
    isInstalled: false,
    isStandalone: false,
    isWebView: false,
    source: "browser",
  }));

  useEffect(() => {
    const sync = detectInstalledSync();
    setState({
      isInstalled: sync.installed,
      isStandalone: sync.installed,
      isWebView: sync.webview,
      source: sync.source,
    });

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
            setState((prev) => ({ ...prev, isInstalled: true, isStandalone: true, source: "installed" }));
          }
        })
        .catch(() => undefined);
    }

    const onInstalled = () => {
      writeInstalledFlag();
      setState({ isInstalled: true, isStandalone: true, isWebView: sync.webview, source: "installed" });
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return state;
}
