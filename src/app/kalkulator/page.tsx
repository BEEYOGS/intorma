import type { Metadata } from "next";
import { PrintCalculator } from "@/components/PrintCalculator";
import { TopBar } from "@/components/TopBar";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Kalkulator cetak",
  description: "Hitung bleed, area aman, resolusi, dan ukuran file sebelum mengirim desain ke produksi.",
};

export default async function KalkulatorPage() {
  const admin = await isAdmin();

  return (
    <div>
      <TopBar isAdmin={admin} />
      <PrintCalculator />
    </div>
  );
}
