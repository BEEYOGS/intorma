"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { closeTopOverlay } from "@/lib/overlay-stack";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

/**
 * Tombol back Android dengan urutan yang benar:
 * 1. tutup sheet/dialog teratas, 2. kembali ke halaman sebelumnya dalam aplikasi,
 * 3. baru keluar bila memang tidak ada riwayat navigasi internal.
 */
export function AppBackHandler() {
  const pathname = usePathname();
  const internalSteps = useRef(0);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current !== pathname) {
      internalSteps.current += 1;
      lastPath.current = pathname;
    }
  }, [pathname]);

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
          if (closeTopOverlay()) return;
          if (internalSteps.current > 0) {
            internalSteps.current -= 1;
            window.history.back();
            return;
          }
          void App.exitApp();
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
