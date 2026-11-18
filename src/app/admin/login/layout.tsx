import type { Metadata } from "next";

export const metadata: Metadata = { title: "Masuk admin", robots: { index: false } };

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
