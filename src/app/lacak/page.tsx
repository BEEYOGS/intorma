"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/app/actions";
import { Footer, Nav } from "@/components/Chrome";
import { WhatsAppLink } from "@/components/WhatsApp";

export default function LacakPage() {
  const [state, action, pending] = useActionState(lookupOrder, null);

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line bg-sand/40">
          <div className="wrap py-12 sm:py-16">
            <p className="eyebrow">Lacak pesanan</p>
            <h1 className="display mt-5 max-w-2xl text-[clamp(2.4rem,6vw,4.2rem)]">
              Pesanan kamu{" "}
              <span className="font-serif font-normal italic tracking-[-0.02em] text-accent">di mana?</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-mute sm:text-base sm:leading-7">
              Masukkan kode pesanan yang dikirim lewat WhatsApp. Halaman ini menampilkan status, riwayat,
              harga, dan instruksi pembayaran.
            </p>
          </div>
        </div>

        <div className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-16">
          <div>
            <div className="space-y-3">
              {[
                ["Kode ada di pesan WhatsApp", "Dikirim otomatis setelah kamu mengisi formulir pesanan."],
                ["Formatnya INT-XXXXXX", "Huruf besar/kecil sama saja. Tanda hubung opsional."],
                ["Bisa juga lewat chat", "Kirim “status INT-XXXXXX” ke WhatsApp kami untuk balasan otomatis."],
              ].map(([title, body]) => (
                <div key={title} className="card p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-mute">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-mute">
              Kode hilang?{" "}
              <WhatsAppLink
                text="Halo in.torma, saya kehilangan kode pesanan. Nama saya:"
                className="font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              >
                Chat kami
              </WhatsAppLink>{" "}
              dengan nama dan nomor WhatsApp yang dipakai saat memesan.
            </p>
          </div>

          <div className="card p-6 shadow-card sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Cek status</h2>
              <span className="tag border-accent/25 text-accent">Live</span>
            </div>
            <form action={action} className="mt-6 grid gap-5">
              <label className="block">
                <span className="label">Kode pesanan</span>
                <input
                  name="kode"
                  placeholder="INT-ABC123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="field font-mono text-[15px] font-semibold uppercase tracking-[0.16em]"
                  required
                />
              </label>
              {state?.error && (
                <p role="alert" className="rounded-tag-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}
              <button disabled={pending} className="btn-primary w-full sm:w-auto">
                {pending ? "Mencari…" : "Lihat pesanan"}
                {!pending && <span aria-hidden="true">→</span>}
              </button>
            </form>
            <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
              Halaman ini hanya menampilkan data pesanan, bukan data pembayaran sensitif. Jangan bagikan
              kode pesanan ke orang lain.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
