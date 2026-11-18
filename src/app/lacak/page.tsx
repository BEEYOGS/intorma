"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/app/actions";
import { Footer, Nav } from "@/components/Chrome";
import { waLink } from "@/lib/site";

export default function LacakPage() {
  const [state, action, pending] = useActionState(lookupOrder, null);

  return (
    <>
      <Nav />
      <main id="konten" className="wrap py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-24">
          <div>
            <p className="eyebrow">Lacak pesanan</p>
            <h1 className="display mt-5 text-[clamp(2.5rem,6vw,4.5rem)]">
              Pesanan kamu
              <br />
              <span className="font-serif font-normal italic tracking-[-0.02em]">di mana?</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-ink/65 sm:text-base sm:leading-7">
              Masukkan kode pesanan yang dikirim lewat WhatsApp. Halaman ini menampilkan status, riwayat,
              harga, dan instruksi pembayaran.
            </p>

            <dl className="mt-9 space-y-5 border-t border-line pt-6 text-sm">
              <div>
                <dt className="font-semibold">Kode ada di pesan WhatsApp</dt>
                <dd className="mt-1 text-mute">Dikirim otomatis setelah kamu mengisi formulir pesanan.</dd>
              </div>
              <div>
                <dt className="font-semibold">Formatnya INT-XXXXXX</dt>
                <dd className="mt-1 text-mute">Huruf besar/kecil sama saja. Tanda hubung opsional.</dd>
              </div>
              <div>
                <dt className="font-semibold">Bisa juga lewat chat</dt>
                <dd className="mt-1 text-mute">
                  Kirim “status INT-XXXXXX” ke{" "}
                  <a href={waLink("status INT-")} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                    WhatsApp kami
                  </a>{" "}
                  untuk balasan otomatis.
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-tag-lg border border-line bg-panel/60 p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">Cek status</h2>
            <form action={action} className="mt-6 grid gap-5">
              <label className="block">
                <span className="label">Kode pesanan</span>
                <input
                  name="kode"
                  placeholder="INT-ABC123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="field font-mono text-[15px] font-semibold uppercase tracking-[0.12em]"
                  required
                />
              </label>
              {state?.error && (
                <p role="alert" className="text-sm text-[#8f2b20]">{state.error}</p>
              )}
              <button disabled={pending} className="btn-primary w-full sm:w-auto">
                {pending ? "Mencari…" : "Lihat pesanan"}
                {!pending && <span aria-hidden="true">→</span>}
              </button>
            </form>
            <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
              Kode hilang? Chat kami dengan nama dan nomor WhatsApp yang dipakai saat memesan.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
