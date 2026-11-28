"use client";

import { useEffect, useState } from "react";

/** Deteksi breakpoint Tailwind `sm` (640px) setelah hidrasi. */
export function useIsMobile(maxWidth = 639): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setMobile(query.matches);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, [maxWidth]);

  return mobile;
}
