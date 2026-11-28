"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, X } from "lucide-react";
import { lookupOrder } from "@/app/actions";
import { RECENT_KEY, readRecentOrders, type RecentOrder } from "@/components/RememberOrder";

export function LacakForm() {
  const [state, action, pending] = useActionState(lookupOrder, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setRecent(readRecentOrders());
    refresh();
    setReady(true);
    window.addEventListener("intorma:recent-orders", refresh);
    return () => window.removeEventListener("intorma:recent-orders", refresh);
  }, []);

  function useRecent(code: string) {
    if (!inputRef.current) return;
    inputRef.current.value = code;
    inputRef.current.focus();
  }

  function clearRecent() {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      /* Abaikan penyimpanan yang ditolak. */
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Cek status</h2>
        <span className="tag border-accent/25 text-accent">Live</span>
      </div>
      <form action={action} className="mt-6 grid gap-5">
        <label className="block">
          <span className="label">Kode pesanan</span>
          <input
            ref={inputRef}
            name="kode"
            placeholder="INT-251126001"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="field font-mono text-base font-semibold uppercase tracking-[0.16em] sm:text-[15px]"
            required
          />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-tag-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? "Mencari…" : "Lihat pesanan"}
          {!pending && <ArrowRight aria-hidden className="size-4" />}
        </button>
      </form>

      {ready && recent.length > 0 && (
        <section className="mt-6 border-t border-line pt-5" aria-labelledby="recent-lookup-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="recent-lookup-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
              <Clock3 aria-hidden className="size-3.5" /> Kode terakhir
            </h3>
            <button
              type="button"
              onClick={clearRecent}
              className="inline-flex min-h-12 items-center gap-1 text-xs font-medium text-[var(--text-3)] underline underline-offset-4 hover:text-[var(--text)]"
            >
              <X aria-hidden className="size-3.5" /> Hapus
            </button>
          </div>
          <div className="chip-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {recent.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => useRecent(item.code)}
                className="mono inline-flex min-h-12 shrink-0 items-center rounded-tag-sm border border-line px-3 text-xs font-medium text-[var(--text-2)] transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)]"
              >
                {item.code}
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-mute">
        Halaman ini hanya menampilkan data pesanan, bukan data pembayaran sensitif. Jangan bagikan
        kode pesanan ke orang lain.
      </p>
    </div>
  );
}
