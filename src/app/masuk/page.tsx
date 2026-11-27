import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CustomerAuthForm } from "@/components/CustomerAuthForm";
import { TopBar } from "@/components/TopBar";
import { getCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk ke portal" };

export default async function LoginPage() {
  if (await getCustomer()) redirect("/portal");

  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
        <div>
          <p className="eyebrow mb-3">Portal klien</p>
          <h1 className="display text-3xl sm:text-4xl">Semua pesananmu, dalam satu tempat.</h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-[var(--text-2)]">
            Masuk untuk melihat status, total, dan riwayat pesanan tanpa perlu mengingat kode satu per satu.
            Membuat akun juga menghubungkan pesanan lama yang memakai nomor WhatsApp yang sama.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[var(--text-2)]">
            {[
              "Riwayat pesanan lengkap dengan rincian harga",
              "Pesan ulang layanan favorit dalam satu klik",
              "Data diri tersimpan, formulir jadi lebih cepat",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--text-3)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-mute">
            Belum siap pesan?{" "}
            <Link href="/order" className="text-[var(--text)] underline underline-offset-4 hover:text-[var(--accent)]">
              Langsung buat pesanan <ArrowRight aria-hidden className="inline size-3.5 align-[-2px]" />
            </Link>
          </p>
        </div>
        <CustomerAuthForm />
      </div>
    </div>
  );
}
