"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, Link2, Search, X } from "lucide-react";
import { toast } from "@/components/Toast";
import { ProductIllustration } from "@/components/ProductIllustration";
import type { Service } from "@/lib/db";
import { priceLabel } from "@/lib/pricing";
import { highlightTerms, searchServices, searchSuggestions } from "@/lib/catalog-search";

const CATEGORIES = [
  { key: "all", label: "Semua" },
  { key: "design", label: "Desain" },
  { key: "print", label: "Cetak & produksi" },
  { key: "other", label: "Lainnya" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];
type SortKey = "recommended" | "price-asc" | "price-desc" | "name";

const SORTS: SortKey[] = ["recommended", "price-asc", "price-desc", "name"];
const isCategory = (value: string | null): value is Category =>
  !!value && CATEGORIES.some((item) => item.key === value);
const isSort = (value: string | null): value is SortKey => !!value && SORTS.includes(value as SortKey);

const CATEGORY_LABEL: Record<string, string> = {
  design: "Desain",
  print: "Cetak",
  other: "Lainnya",
};

function Highlight({ text, query }: { text: string; query: string }) {
  const parts = highlightTerms(text, query);
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded-sm bg-accent/30 px-0.5 text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function ProductCard({ service, query }: { service: Service; query: string }) {
  return (
    <Link
      href={`/order?layanan=${service.id}`}
      className="card card-lift group flex flex-col overflow-hidden"
    >
      <div className="relative grid h-40 place-items-center overflow-hidden border-b border-line bg-white/[0.015] px-5 text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: "radial-gradient(currentColor 0.6px, transparent 0.6px)",
            backgroundSize: "11px 11px",
          }}
        />
        <ProductIllustration service={service} className="relative h-28 w-full max-w-[250px]" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
          {CATEGORY_LABEL[service.category] ?? "Layanan"}
        </p>
        <h2 className="text-[15px] font-medium leading-snug text-[var(--text)]">
          <Highlight text={service.name} query={query} />
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-3)]">
          <Highlight text={service.blurb} query={query} />
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="mono text-sm text-[var(--accent-2)]">{priceLabel(service)}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
              <Clock3 aria-hidden className="size-3" /> ± {service.days} hari
            </p>
          </div>
          <span className="inline-flex size-8 shrink-0 place-items-center rounded-tag-sm border border-line text-[var(--text-3)] transition-colors group-hover:border-[var(--border-2)] group-hover:text-[var(--text)]">
            <ArrowUpRight aria-hidden className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CatalogBrowser({ services }: { services: Service[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pulihkan filter dari URL supaya tautan bisa dibagikan dan tombol kembali bekerja.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const kat = params.get("kat");
    const urut = params.get("urut");
    if (q) setQuery(q.slice(0, 120));
    if (isCategory(kat)) setCategory(kat);
    if (isSort(urut)) setSort(urut);
    setHydrated(true);
  }, []);

  // Tulis filter ke URL tanpa menambah entri riwayat.
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const patch = (key: string, value: string, empty: string) => {
      if (value === empty) params.delete(key);
      else params.set(key, value);
    };
    patch("q", query.trim(), "");
    patch("kat", category, "all");
    patch("urut", sort, "recommended");
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [query, category, sort, hydrated]);

  // Tekan "/" untuk fokus cari, Esc untuk mengosongkan saat kolom aktif.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && target === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const out: Record<Category, number> = { all: services.length, design: 0, print: 0, other: 0 };
    for (const service of services) {
      if (service.category === "design" || service.category === "print" || service.category === "other") {
        out[service.category] += 1;
      }
    }
    return out;
  }, [services]);

  const searched = useMemo(() => (query.trim() ? searchServices(services, query) : services), [services, query]);
  const visible = useMemo(() => {
    const list = searched.filter((service) => category === "all" || service.category === category);
    if (sort !== "recommended") {
      list.sort((a, b) => {
        if (sort === "price-asc") return a.price_from - b.price_from || a.name.localeCompare(b.name, "id");
        if (sort === "price-desc") return b.price_from - a.price_from || a.name.localeCompare(b.name, "id");
        if (sort === "name") return a.name.localeCompare(b.name, "id");
        return a.sort - b.sort || a.name.localeCompare(b.name, "id");
      });
    } else if (!query.trim()) {
      list.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "id"));
    }
    return list;
  }, [searched, category, sort, query]);
  const suggestions = useMemo(
    () => (query.trim() && visible.length === 0 ? searchSuggestions(query) : []),
    [query, visible.length],
  );

  function reset() {
    setQuery("");
    setCategory("all");
    setSort("recommended");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Tautan filter katalog disalin.", "ok");
    } catch {
      toast("Tautan tidak bisa disalin otomatis.", "error");
    }
  }

  const filtered = query.trim() !== "" || category !== "all" || sort !== "recommended";

  return (
    <div>
      <div className="card mb-8 p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem] md:items-end">
          <label className="block">
            <span className="label flex items-center justify-between gap-2">
              <span>Cari layanan</span>
              <kbd className="mono rounded-tag-sm border border-line px-1.5 py-0.5 text-xs font-normal text-mute">
                /
              </kbd>
            </span>
            <span className="relative block">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Misalnya spanduk, kartu nama, atau kemasan…"
                aria-keyshortcuts="/"
                className="field !pl-10 !pr-10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-tag-sm text-[var(--text-3)] transition-colors hover:text-[var(--text)]"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </span>
          </label>
          <label className="block">
            <span className="label">Urutkan</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="field cursor-pointer"
            >
              <option value="recommended">Rekomendasi</option>
              <option value="price-asc">Harga terendah</option>
              <option value="price-desc">Harga tertinggi</option>
              <option value="name">Nama A–Z</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5" role="group" aria-label="Filter kategori katalog">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              aria-pressed={category === item.key}
              className={`inline-flex min-h-10 items-center gap-2 rounded-tag-sm border px-3 text-xs font-medium transition-colors ${
                category === item.key
                  ? "border-accent/40 bg-accent/10 text-ink"
                  : "border-line text-mute hover:border-[var(--border-2)] hover:text-ink"
              }`}
            >
              {item.label}
              <span className="mono text-xs">{String(counts[item.key]).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-4">
        <p className="text-xs text-[var(--text-3)]" aria-live="polite">
          Menampilkan <span className="mono text-[var(--text)]">{visible.length}</span> dari{" "}
          <span className="mono text-[var(--text)]">{services.length}</span> layanan
        </p>
        {filtered && (
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-mute transition-colors hover:text-ink"
            >
              <Link2 aria-hidden className="size-3.5" /> Salin tautan
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 items-center text-xs font-medium text-[var(--accent-2)] underline underline-offset-4 hover:text-[var(--text)]"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-tag-lg border border-dashed border-line bg-panel/40 p-10 text-center">
          <p className="text-sm font-medium">Tidak ada layanan yang cocok.</p>
          <p className="mt-1 text-xs text-[var(--text-3)]">Coba kata kunci lain atau reset filter.</p>
          {suggestions.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-mute">Mungkin maksudmu:</span>
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="inline-flex min-h-9 items-center rounded-tag-sm border border-accent/30 bg-accent/10 px-3 text-xs font-medium text-ink transition-colors hover:bg-accent/20"
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={reset} className="btn btn-ghost mt-5 min-h-10 px-4 text-sm">
            Tampilkan semua layanan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <ProductCard key={service.id} service={service} query={query} />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link href="/order" className="btn btn-primary min-h-11 px-5 text-sm">
          Pesan layanan <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </div>
  );
}
