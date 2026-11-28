"use client";

import { useEffect } from "react";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

/** Tombol back Android: kembali ke halaman sebelumnya, baru keluar di root. */
export function AppBackHandler() {
  useEffect(() => {
    const win = window as Window & { Capacitor?: CapacitorBridge };
    const native =
      win.Capacitor?.isNativePlatform?.() === true ||
      win.Capacitor?.getPlatform?.() === "android" ||
      /in\.torma-app/i.test(navigator.userAgent || "");
    if (!native) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("backButton", () => {
          if (window.history.length > 1) window.history.back();
          else void App.exitApp();
        }),
      )
      .then((handle) => {
        if (cancelled) void handle.remove();
        else removeListener = () => void handle.remove();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  return null;
}
