"use client";

import { useActionState } from "react";
import { lookupOrder } from "@/app/actions";
import { Footer, Nav } from "@/components/Chrome";

export default function LacakPage() {
  const [state, action, pending] = useActionState(lookupOrder, null);
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="text-5xl font-bold leading-none tracking-tightest sm:text-6xl">Lacak pesanan</h1>
        <p className="mt-4 max-w-md text-soft">Masukkan kode pesanan dari WhatsApp. Bentuknya INT-ABC123.</p>
        <form action={action} className="mt-10 flex max-w-md flex-col gap-4">
          <label>
            <span className="mb-2 block text-sm text-soft">Kode pesanan</span>
            <input name="kode" placeholder="INT-ABC123" autoCapitalize="characters" className="field font-bold tracking-widest" required />
          </label>
          {state?.error && <p role="alert" className="text-[#ff5d5d]">{state.error}</p>}
          <button disabled={pending} className="btn-solid self-start">{pending ? "Mencari..." : "Cari pesanan"}</button>
        </form>
      </main>
      <Footer />
    </>
  );
}
