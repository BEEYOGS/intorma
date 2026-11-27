"use client";

import { useActionState, useState } from "react";
import { loginCustomer, registerCustomer, type CustomerState } from "@/app/actions";

export function CustomerAuthForm({ next = "/portal" }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState<CustomerState, FormData>(loginCustomer, null);
  const [registerState, registerAction, registerPending] = useActionState<CustomerState, FormData>(registerCustomer, null);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 border-b border-[var(--border)]" role="tablist" aria-label="Akun">
        {([
          ["login", "Masuk"],
          ["register", "Daftar"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`h-11 text-[13px] font-medium transition-colors ${
              mode === value
                ? "bg-[var(--panel-2)] text-[var(--text)]"
                : "text-[var(--text-3)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {mode === "login" ? (
          <form action={loginAction} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <p className="eyebrow mb-1">Selamat datang kembali</p>
              <p className="text-sm text-mute">Masuk untuk melihat pesanan dan riwayatmu.</p>
            </div>
            <label className="block">
              <span className="label">Email</span>
              <input name="email" type="email" autoComplete="email" className="input" required placeholder="nama@email.com" />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input name="password" type="password" autoComplete="current-password" className="input" required placeholder="Minimal 8 karakter" aria-invalid={Boolean(loginState?.error)} aria-describedby={loginState?.error ? "login-error" : undefined} />
            </label>
            <label className="flex min-h-11 items-start gap-3 rounded-tag-sm border border-line px-3 py-2.5 text-xs leading-5 text-mute">
              <input type="checkbox" name="claim" className="mt-1 size-4 accent-[var(--accent)]" />
              <span>Hubungkan pesanan lama dengan nomor WhatsApp ini (hanya jika nomornya memang milikmu).</span>
            </label>
            {loginState?.error && <p id="login-error" role="alert" className="text-xs text-danger">{loginState.error}</p>}
            <button type="submit" disabled={loginPending} className="btn btn-primary !h-11 text-sm">
              {loginPending ? "Memeriksa…" : "Masuk ke portal"}
            </button>
          </form>
        ) : (
          <form action={registerAction} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <p className="eyebrow mb-1">Buat akun</p>
              <p className="text-sm text-mute">Akun baru. Pesanan lama bisa dihubungkan jika nomornya memang milikmu.</p>
            </div>
            <label className="block">
              <span className="label">Nama</span>
              <input name="name" autoComplete="name" className="input" required placeholder="Nama kamu" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">WhatsApp</span>
                <input name="wa" inputMode="tel" autoComplete="tel" className="input" required placeholder="0812 3456 7890" />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input name="email" type="email" autoComplete="email" className="input" required placeholder="nama@email.com" />
              </label>
            </div>
            <label className="block">
              <span className="label">Password</span>
              <input name="password" type="password" autoComplete="new-password" className="input" required minLength={8} placeholder="Minimal 8 karakter" aria-invalid={Boolean(registerState?.error)} aria-describedby={registerState?.error ? "register-error" : undefined} />
            </label>
            <label className="flex min-h-11 items-start gap-3 rounded-tag-sm border border-line px-3 py-2.5 text-xs leading-5 text-mute">
              <input type="checkbox" name="claim" className="mt-1 size-4 accent-[var(--accent)]" />
              <span>Hubungkan pesanan lama dengan nomor WhatsApp ini (opsional, hanya jika nomornya milikmu).</span>
            </label>
            {registerState?.error && <p id="register-error" role="alert" className="text-xs text-danger">{registerState.error}</p>}
            <button type="submit" disabled={registerPending} className="btn btn-primary !h-11 text-sm">
              {registerPending ? "Membuat akun…" : "Daftar & masuk"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
