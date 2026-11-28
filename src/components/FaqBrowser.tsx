"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { CopyTextButton } from "@/components/CopyTextButton";

export function FaqBrowser({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [query, setQuery] = useState("");
  const [openAll, setOpenAll] = useState(false);
  const [version, setVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return faqs;
    return faqs.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(needle));
  }, [faqs, query]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="relative block">
          <span className="sr-only">Cari pertanyaan</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pertanyaan…"
            className="field !pl-10 !pr-12"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Hapus pencarian"
              className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center text-[var(--text-3)] hover:text-[var(--text)]"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-mute">
            {visible.length} dari {faqs.length} pertanyaan
          </span>
          <button
            type="button"
            onClick={() => {
              setOpenAll((value) => !value);
              setVersion((value) => value + 1);
            }}
            className="inline-flex min-h-12 items-center rounded-tag-sm border border-line px-3 text-xs text-mute transition-colors hover:text-[var(--text)]"
          >
            {openAll ? "Tutup semua" : "Buka semua"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">Tidak ada pertanyaan yang cocok.</p>
          <p className="mt-2 text-sm text-mute">Coba kata kunci lain atau hubungi kami lewat WhatsApp.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <details key={`${item.q}-${version}`} className="card group p-5" open={openAll}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span>{item.q}</span>
                <span aria-hidden className="text-[var(--text-3)] transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="text-sm leading-6 text-mute">{item.a}</p>
                <CopyTextButton value={item.a} label={`Salin jawaban: ${item.q}`} className="shrink-0" />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
