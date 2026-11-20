"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/app/actions";
import { Footer, Nav } from "@/components/Chrome";
import { Barcode, ToneChips, CropCorners, RegMark } from "@/components/Press";
import { WhatsAppLink } from "@/components/WhatsApp";

export default function LacakPage() {
  const [state, action, pending] = useActionState(lookupOrder, null);

  return (
    <>
      <Nav />
      <main id="konten" className="wrap py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-24">
          <div className="enter">
            <p className="eyebrow flex items-center gap-2.5">
              <RegMark className="size-3.5 text-ink" />
              Lacak pesanan
            </p>
            <h1 className="display mt-6 text-[clamp(2.5rem,6vw,4.5rem)]">
              Pesanan kamu
              <br />
              <span className="font-serif font-normal italic tracking-[-0.02em] text-ink">di mana?</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-ink/65 sm:text-base sm:leading-7">
              Masukkan kode pesanan yang dikirim lewat WhatsApp. Halaman ini menampilkan status, riwayat,
              harga, dan instruksi pembayaran.
            </p>

            <dl className="mt-10 space-y-6 border-t border-line pt-7 text-sm">
              <div className="flex gap-4">
                <span aria-hidden className="mt-1 font-mono text-xs text-ink">01</span>
                <div>
                  <dt className="font-semibold">Kode ada di pesan WhatsApp</dt>
                  <dd className="mt-1 text-mute">Dikirim otomatis setelah kamu mengisi formulir pesanan.</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <span aria-hidden className="mt-1 font-mono text-xs text-silver">02</span>
                <div>
                  <dt className="font-semibold">Formatnya INT-XXXXXX</dt>
                  <dd className="mt-1 text-mute">Huruf besar/kecil sama saja. Tanda hubung opsional.</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <span aria-hidden className="mt-1 font-mono text-xs text-steel">03</span>
                <div>
                  <dt className="font-semibold">Bisa juga lewat chat</dt>
                  <dd className="mt-1 text-mute">
                    Kirim “status INT-XXXXXX” ke{" "}
                    <WhatsAppLink text="status INT-" className="link-accent">
                      WhatsApp kami
                    </WhatsAppLink>{" "}
                    untuk balasan otomatis.
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="enter relative rounded-tag-xl border border-line bg-panel/70 p-6 shadow-ticket sm:p-8" style={{ "--enter-delay": "140ms" } as React.CSSProperties}>
            <CropCorners />
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Cek status</h2>
              <ToneChips className="size-2" />
            </div>

            <Barcode value="SCAN-STATUS" height={30} className="mt-5 text-ink/25" label="" />

            <form action={action} className="mt-6 grid gap-5">
              <label className="block">
                <span className="label">Kode pesanan</span>
                <div className="flex items-stretch">
                  <span aria-hidden className="grid shrink-0 place-items-center rounded-[0.7rem_0_0_0] border border-r-0 border-line bg-sand px-3.5 font-mono text-sm font-bold text-ink">
                    INT-
                  </span>
                  <input
                    name="kode"
                    placeholder="ABC123"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="field rounded-[0_0.7rem_0.7rem_0] font-mono text-[15px] font-semibold uppercase tracking-[0.18em]"
                    required
                  />
                </div>
              </label>
              {state?.error && (
                <p role="alert" className="rounded-tag-sm border border-dashed border-silver/40 bg-silver/[0.08] px-3 py-2 text-sm text-silver">{state.error}</p>
              )}
              <button disabled={pending} className="btn-primary w-full sm:w-auto">
                {pending ? "Mencari…" : "Lihat pesanan"}
                {!pending && <span aria-hidden="true">→</span>}
              </button>
            </form>
            <p className="mt-6 border-t border-dashed border-line pt-4 text-xs leading-5 text-mute">
              Kode hilang? Chat kami dengan nama dan nomor WhatsApp yang dipakai saat memesan.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}