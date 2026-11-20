import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TopBar } from "@/components/TopBar";
import { isAdmin } from "@/lib/auth";
import "./globals.css";

const fontSans = localFont({
  src: "./fonts/instrument-sans-latin.woff2",
  weight: "400 700",
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "in.torma — Studio desain & cetak", template: "%s — in.torma" },
  description: "Logo, poster, konten sosial, kemasan, sampai spanduk dan kartu nama. Brief singkat, harga jelas, progres bisa dipantau.",
  applicationName: "in.torma",
};

export const viewport: Viewport = {
  themeColor: "#090c10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontSans.variable}>
      <body className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
        <TopBar isAdmin={await isAdmin()} />
        <main>{children}</main>
      </body>
    </html>
  );
}