"use client";

import dynamic from "next/dynamic";

// Dialog install tidak dibutuhkan pada render pertama dan tidak boleh aktif
// sama sekali di app terinstal. Muat setelah hidrasi untuk menjaga bundle awal ringan.
const InstallButton = dynamic(() => import("./PWA").then((mod) => mod.InstallButton), {
  ssr: false,
});

export function InstallButtonLazy() {
  return <InstallButton />;
}
