"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin } from "@/app/actions";
import { Barcode, CmykChips, CropCorners, RegMark } from "@/components/Press";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, null);

  return (
    <main id="konten" className="grid min-h-dvh lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative flex flex-col justify-between overflow-hidden border-b border-line bg-sand/70 p-7 sm:p-12 lg:border-b-0 lg:border-r">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-cyan/[0.07] blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[24rem] rounded-full bg-magenta/[0.06] blur-[110px]" />
        <Link href="/" aria-label={`${SITE_NAME}, beranda`} className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/int.svg" alt={`${SITE_NAME} — ${TAGLINE}`} className="h-8 w-auto" />
        </Link>
        <div className="relative max-w-md py-14">
          <p className="eyebrow flex items-center gap-2.5">
            <RegMark className="size-3.5 text-magenta" />
            Area admin
          </p>
          <h1 className="display mt-6 text-4xl sm:text-5xl">Kelola pesanan, layanan, dan pembayaran.</h1>
          <p className="mt-5 text-sm leading-6 text-mute">
            Halaman ini hanya untuk pemilik studio. Perubahan langsung tampil di situs.
          </p>
          <Barcode value="ADMIN-ACCESS" height={28} className="mt-10 max-w-[14rem] text-ink/25" label="" />
        </div>
        <div className="relative flex items-center gap-3">
          <CmykChips className="size-2" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mute">
            {SITE_NAME} — {TAGLINE}
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-7 sm:p-12">
        <div className="relative w-full max-w-sm border border-line bg-panel/60 p-7">
          <CropCorners />
          <h2 className="text-xl font-semibold tracking-tight">Masuk</h2>
          <p className="mt-1 text-sm text-mute">Gunakan password admin.</p>
          <form action={action} className="mt-7 grid gap-5">
            <label className="block">
              <span className="label">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="field"
                required
                autoFocus
              />
            </label>
            {state?.error && <p role="alert" className="border border-red/40 bg-red/[0.08] px-3 py-2 text-sm text-red">{state.error}</p>}
            <button disabled={pending} className="btn-primary w-full">
              {pending ? "Memeriksa…" : "Masuk"}
            </button>
          </form>
          <p className="mt-6 border-t border-dashed border-line pt-4 text-xs leading-5 text-mute">
            Halaman ini hanya untuk pemilik studio. Kalau kamu pelanggan, pantau pesananmu di halaman lacak.
          </p>
        </div>
      </section>
    </main>
  );
}