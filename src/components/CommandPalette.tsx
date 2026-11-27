"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type OrderResult = { code: string; name: string; status: string };
type ServiceResult = { id: string; name: string; active: boolean };
type PageResult = { title: string; url: string };

type SearchResponse = {
  pages: PageResult[];
  orders: OrderResult[];
  services: ServiceResult[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse>({ pages: [], orders: [], services: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setData({ pages: [], orders: [], services: [] });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      const items = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-cmd-item]"));
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (items.length === 0) return;
        event.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          event.key === "ArrowDown"
            ? current < 0
              ? 0
              : (current + 1) % items.length
            : current <= 0
              ? items.length - 1
              : current - 1;
        items[next].focus();
        return;
      }
      if (event.key === "Home" && items.length) {
        event.preventDefault();
        items[0].focus();
        return;
      }
      if (event.key === "End" && items.length) {
        event.preventDefault();
        items[items.length - 1].focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("gagal");
        const json = (await res.json()) as SearchResponse;
        if (!controller.signal.aborted) setData(json);
      } catch {
        if (!controller.signal.aborted) setData({ pages: [], orders: [], services: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  function go(url: string) {
    close();
    router.push(url);
  }

  if (!open) return null;

  const hasResults = data.pages.length || data.orders.length || data.services.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl overflow-hidden rounded-tag-lg border border-line bg-panel shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="command-palette-title" className="sr-only">Pencarian cepat</h2>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search aria-hidden className="size-4 text-mute" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari pesanan, layanan, atau halaman"
            placeholder="Cari pesanan, layanan, atau halaman…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
          />
          {loading && <span className="text-xs text-mute">…</span>}
          <button type="button" onClick={close} aria-label="Tutup" className="grid size-7 place-items-center rounded-full text-mute hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasResults && !loading && (
            <p className="px-3 py-6 text-center text-sm text-mute">
              {query ? "Tidak ada hasil." : "Ketik untuk mencari. Tekan Esc untuk tutup."}
            </p>
          )}

          {data.pages.length > 0 && (
            <Group title="Halaman">
              {data.pages.map((p) => (
                <Item key={p.url} label={p.title} hint={p.url} onClick={() => go(p.url)} />
              ))}
            </Group>
          )}

          {data.orders.length > 0 && (
            <Group title="Pesanan">
              {data.orders.map((o) => (
                <Item
                  key={o.code}
                  label={`${o.code} — ${o.name}`}
                  hint={o.status}
                  onClick={() => go(`/admin?open=${o.code}`)}
                />
              ))}
            </Group>
          )}

          {data.services.length > 0 && (
            <Group title="Layanan">
              {data.services.map((s) => (
                <Item
                  key={s.id}
                  label={s.name}
                  hint={s.active ? "aktif" : "nonaktif"}
                  onClick={() => go(`/admin/layanan`)}
                />
              ))}
            </Group>
          )}
        </div>

        <div className="border-t border-line px-4 py-2 text-[11px] text-mute">
          <kbd className="rounded border border-line px-1.5 py-0.5">Ctrl</kbd> + <kbd className="rounded border border-line px-1.5 py-0.5">K</kbd> buka/tutup · <kbd className="rounded border border-line px-1.5 py-0.5">Esc</kbd> tutup
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-cmd-item
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-tag-sm px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04] focus:bg-white/[0.06]"
    >
      <span className="truncate">{label}</span>
      {hint && <span className="shrink-0 text-xs text-mute">{hint}</span>}
    </button>
  );
}