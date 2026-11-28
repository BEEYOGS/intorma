import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Footer } from "@/components/Chrome";
import { TopBar } from "@/components/TopBar";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { CONTACT_EMAIL } from "@/lib/site";

/** Ditelampilkan kalau kode diketahui tetapi bukti kepemilikan tidak ada. */
export function OrderAccessGate({ code }: { code: string }) {
  const next = `/lacak/${encodeURIComponent(code)}`;
  return (
    <>
      <TopBar />
      <div className="wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="eyebrow">Akses pesanan</p>
          <h1 className="display mt-3 text-3xl sm:text-4xl">Detail pesanan dilindungi.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[var(--text-2)]">
            Kode <span className="mono font-semibold text-[var(--text)]">{code}</span> dikenali, tetapi
            rincian pelanggan, brief, harga, dan instruksi pembayaran hanya ditampilkan kepada pemilik
            pesanan. Gunakan tautan pribadi yang kami kirim lewat WhatsApp, atau masuk ke portal klien.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <WhatsAppLink
              text={`Halo in.torma, saya butuh tautan akses untuk pesanan ${code}.`}
              className="btn-wa min-h-12 px-5 text-sm"
            >
              <WhatsAppIcon aria-hidden className="size-4" /> Minta tautan via WhatsApp
            </WhatsAppLink>
            <Link
              href={`/masuk?next=${encodeURIComponent(next)}`}
              className="btn btn-primary min-h-12 px-5 text-sm"
            >
              Masuk ke portal
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="mt-6 text-xs leading-5 text-mute">
            Kesulitan mengakses? Hubungi {CONTACT_EMAIL} atau nomor WhatsApp di halaman ini.
          </p>
        </div>
        <aside className="card h-fit p-6">
          <LockKeyhole aria-hidden className="size-5 text-accent" />
          <p className="mt-4 text-sm font-semibold">Kenapa perlu login?</p>
          <p className="mt-2 text-xs leading-5 text-mute">
            Kode harian bersifat berurutan. Tanpa verifikasi, kode itu bisa dipakai orang lain untuk
            melihat data pribadi dan spesifikasi cetakan kamu.
          </p>
        </aside>
      </div>
      <Footer />
    </>
  );
}
