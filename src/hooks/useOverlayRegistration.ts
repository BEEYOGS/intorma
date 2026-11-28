"use client";

import { useEffect, useRef } from "react";
import { registerOverlay } from "@/lib/overlay-stack";

/**
 * Hubungkan sheet/dialog ke tumpukan overlay global. `close` disimpan di ref
 * supaya perubahan fungsi tidak mendaftar ulang overlay setiap render.
 */
export function useOverlayRegistration(id: string, open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    return registerOverlay({ id, close: () => closeRef.current() });
  }, [id, open]);
}
