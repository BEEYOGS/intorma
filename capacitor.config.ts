import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.intorma.app",
  appName: "in.torma",
  webDir: "public",
  server: {
    url: "https://intorma-psi.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
