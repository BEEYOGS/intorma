"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { closeTopOverlay } from "@/lib/overlay-stack";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type IndexedHistoryState = Record<string, unknown> & { __intormaIndex?: number };

/**
 * Tombol back Android dengan urutan yang benar:
 * 1. tutup sheet/dialog teratas, 2. kembali ke halaman sebelumnya dalam aplikasi,
 * 3. baru keluar bila memang tidak ada riwayat navigasi internal.
 *
 * Index disimpan di `history.state` supaya back/forward browser tidak
 * menambah hitungan navigasi internal.
 */
export function AppBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const internalSteps = useRef(0);
  const lastPath = useRef(pathname);
  const pathnameRef = useRef(pathname);
  const popped = useRef(false);
  const replacingRoot = useRef(false);
  pathnameRef.current = pathname;

  useEffect(() => {
    const state = window.history.state as IndexedHistoryState | null;
    if (typeof state?.__intormaIndex === "number") {
      internalSteps.current = Math.max(0, state.__intormaIndex);
    } else {
      window.history.replaceState({ ...(state ?? {}), __intormaIndex: 0 }, "");
      internalSteps.current = 0;
    }

    const onPop = () => {
      popped.current = true;
      const next = (window.history.state as IndexedHistoryState | null)?.__intormaIndex;
      internalSteps.current =
        typeof next === "number" ? Math.max(0, next) : Math.max(0, internalSteps.current - 1);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    if (popped.current) {
      popped.current = false;
      return;
    }

    if (replacingRoot.current) {
      replacingRoot.current = false;
      internalSteps.current = 0;
    } else {
      internalSteps.current += 1;
    }

    const state = window.history.state as IndexedHistoryState | null;
    window.history.replaceState(
      { ...(state ?? {}), __intormaIndex: internalSteps.current },
      "",
    );
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
            window.history.back();
            return;
          }
          // Deep-link langsung ke detail tidak punya riwayat internal;
          // kembalikan ke beranda sekali, lalu back berikutnya baru keluar.
          if (pathnameRef.current !== "/") {
            replacingRoot.current = true;
            router.replace("/");
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
  }, [router]);

  return null;
}
