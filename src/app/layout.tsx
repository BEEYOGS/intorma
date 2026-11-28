import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fontSans = localFont({
  src: "./fonts/instrument-sans-latin.woff2",
  weight: "400 700",
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const fontSerifItalic = localFont({
  src: "./fonts/instrument-serif-italic-latin.woff2",
  weight: "400",
  variable: "--font-signature",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

import { ToastHost } from "@/components/Toast";
import { PageFade } from "@/components/PageFade";
import { ScrollProgress } from "@/components/ScrollProgress";
import { StorefrontBottomNav } from "@/components/StorefrontBottomNav";
import { ServiceWorkerRegister } from "@/components/PWA";
import { InstallButtonLazy } from "@/components/InstallButtonLazy";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://intorma-psi.vercel.app"),
  title: { default: "in.torma — Studio desain & cetak", template: "%s — in.torma" },
  applicationName: "in.torma",
  manifest: "/manifest.webmanifest?v=4",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "in.torma",
    title: "in.torma — Studio desain & cetak",
    description: "Logo, poster, konten sosial, kemasan, sampai spanduk dan kartu nama. Brief singkat, harga jelas, progres bisa dipantau.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
    ],
    shortcut: "/icons/icon-192.png?v=4",
    apple: [{ url: "/icons/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "in.torma",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontSerifItalic.variable}`}>
      <head>
        <meta
          name="description"
          content="Logo, poster, konten sosial, kemasan, sampai spanduk dan kartu nama. Brief singkat, harga jelas, progres bisa dipantau."
        />
      </head>
      <body className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
        <a href="#konten" className="skip-link">Lewati ke konten</a>
        <ScrollProgress />
        <PageFade>
          <main id="konten" className="main-content">{children}</main>
        </PageFade>
        <StorefrontBottomNav />
        <ServiceWorkerRegister />
        <InstallButtonLazy />
        <ToastHost />
      </body>
    </html>
  );
}