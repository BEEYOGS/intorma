"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/int.svg" alt="in.tarma" className="h-8 w-auto self-start" />
      <h1 className="text-3xl font-bold tracking-tight">Masuk admin</h1>
      <form action={action} className="flex flex-col gap-4">
        <label>
          <span className="mb-2 block text-sm text-soft">Password</span>
          <input name="password" type="password" autoComplete="current-password" className="field" required />
        </label>
        {state?.error && <p role="alert" className="text-[#ff5d5d]">{state.error}</p>}
        <button disabled={pending} className="btn-solid self-start">{pending ? "Memeriksa..." : "Masuk"}</button>
      </form>
    </main>
  );
}
