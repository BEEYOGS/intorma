"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin } from "@/app/actions";
import { SITE_NAME, TAGLINE } from "@/lib/site";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, null);

  return (
    <main id="konten" className="grid min-h-dvh lg:grid-cols-[1.1fr_.9fr]">
      <section className="flex flex-col justify-between border-b border-line p-7 sm:p-12 lg:border-b-0 lg:border-r">
        <Link href="/" aria-label={`${SITE_NAME}, beranda`} className="w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/int.svg" alt={`${SITE_NAME} — ${TAGLINE}`} className="h-8 w-auto" />
        </Link>
        <div className="max-w-md py-14">
          <p className="eyebrow">Area admin</p>
          <h1 className="display mt-5 text-4xl sm:text-5xl">Kelola pesanan, layanan, dan pembayaran.</h1>
          <p className="mt-5 text-sm leading-6 text-mute">
            Halaman ini hanya untuk pemilik studio. Perubahan langsung tampil di situs.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-mute">
          {SITE_NAME} — {TAGLINE}
        </p>
      </section>

      <section className="flex items-center justify-center p-7 sm:p-12">
        <div className="w-full max-w-sm">
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
            {state?.error && <p role="alert" className="text-sm text-[#8f2b20]">{state.error}</p>}
            <button disabled={pending} className="btn-primary w-full">
              {pending ? "Memeriksa…" : "Masuk"}
            </button>
          </form>
          <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
            Password diatur lewat <code className="rounded bg-ink/5 px-1">ADMIN_PASSWORD</code> di{" "}
            <code className="rounded bg-ink/5 px-1">.env.local</code>.
          </p>
        </div>
      </section>
    </main>
  );
}
