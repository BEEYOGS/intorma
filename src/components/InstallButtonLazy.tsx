"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { isInstalledEnvironment } from "@/hooks/useAppEnvironment";

// Dialog install tidak dibutuhkan pada render pertama dan tidak boleh aktif
// sama sekali di app terinstal (PWA, Tauri, maupun Capacitor). Muat setelah
// hidrasi untuk menjaga bundle awal ringan.
const InstallButton = dynamic(() => import("./PWA").then((mod) => mod.InstallButton), {
  ssr: false,
});

export function InstallButtonLazy() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isInstalledEnvironment());
  }, []);

  if (!visible) return null;
  return <InstallButton />;
}
