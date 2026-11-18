import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "in.tarma - pesan jasa desain", template: "%s | in.tarma" },
  description: "Pesan desain logo, poster, feed Instagram, dan kemasan. Status pesanan dikabari lewat WhatsApp.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-ink font-sans text-white">{children}</body>
    </html>
  );
}
