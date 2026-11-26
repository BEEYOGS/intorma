import { ArrowUpRight, Mail } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";

export default function ContactPage() {
  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-12 sm:py-16">
        <div className="max-w-xl">
          <p className="eyebrow mb-2">Kontak</p>
          <h1 className="display text-2xl sm:text-3xl mb-4">Hubungi kami.</h1>
          <p className="text-[15px] text-[var(--text-2)] mb-8">
            Pertanyaan tentang layanan atau pesanan? Hubungi lewat channel di bawah.
          </p>

          <div className="card divide-y divide-[var(--border)]">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">WhatsApp</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">+62 896-1760-7952</p>
              </div>
              <WhatsAppLink
                text="Halo in.torma, saya mau tanya soal layanan desain dan cetak."
                className="btn btn-ghost text-xs"
              >
                <WhatsAppIcon aria-hidden className="size-4" /> Chat WhatsApp
              </WhatsAppLink>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Email</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">lucky77ag@gmail.com</p>
              </div>
              <a href="mailto:lucky77ag@gmail.com" className="btn btn-ghost text-xs">
                <Mail aria-hidden className="size-4" /> Kirim email
              </a>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Instagram</p>
                <p className="mono text-sm text-[var(--text-2)] mt-1">@aku.vza</p>
              </div>
              <a href="https://instagram.com/aku.vza" target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ig.svg" alt="" aria-hidden="true" className="size-4" /> Buka Instagram <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}