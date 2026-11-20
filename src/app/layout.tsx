import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerRegister } from "@/components/PWA";
import { PressBackground } from "@/components/Press";
import "./globals.css";

const sans = localFont({
  src: "./fonts/instrument-sans-latin.woff2",
  weight: "400 700",
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const serif = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: { default: "in.torma — jasa desain", template: "%s — in.torma" },
  description:
    "Studio desain independen. Logo, poster, konten sosial, sampai kemasan. Pesan lewat brief singkat, pantau status pesanan, dan bayar lewat transfer BCA.",
  applicationName: "in.torma",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "in.torma", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0b0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <ServiceWorkerRegister />
        <PressBackground />
        <a href="#konten" className="skip-link">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
