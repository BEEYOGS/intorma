import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android adalah wrapper online ke situs produksi, bukan static export Next.js
 * (SSR/API/server action tidak bisa dibundle ke `public`). Query `source=installed_app`
 * dan UA tambahan dipakai supaya UI install PWA tidak aktif di dalam APK.
 */
const config: CapacitorConfig = {
  appId: "com.intorma.app",
  appName: "in.torma",
  webDir: "public",
  server: {
    url: "https://intorma-psi.vercel.app/?source=installed_app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    appendUserAgent: "in.torma-app",
  },
  plugins: {
    SystemBars: {
      style: "DARK",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
