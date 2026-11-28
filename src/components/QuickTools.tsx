"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  Calculator,
  CircleHelp,
  LayoutGrid,
  Link2,
  PenLine,
  Search,
  X,
} from "lucide-react";
import { MobileSheet } from "@/components/MobileSheet";
import { toast } from "@/components/Toast";

const QUICK_LINKS = [
  { href: "/order", label: "Buat pesanan", icon: PenLine },
  { href: "/lacak", label: "Lacak pesanan", icon: Search },
  { href: "/kalkulator", label: "Hitung cetak", icon: Calculator },
  { href: "/katalog", label: "Jelajahi katalog", icon: LayoutGrid },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function QuickTools() {
  const [showTop, setShowTop] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (event.key === "/") {
        const field = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="cari" i], input[placeholder*="kode" i]',
        );
        if (field) {
          event.preventDefault();
          field.focus();
          field.select();
        }
        return;
      }
      if (event.key.toLowerCase() === "t") {
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Tautan halaman disalin.", "ok");
    } catch {
      toast("Tautan tidak bisa disalin. Salin dari bilah alamat.", "error");
    }
  }

  return (
    <>
      <div
        data-mobile-chrome
        className="pointer-events-none fixed bottom-[calc(var(--bottom-overlay-offset)+4px)] right-3 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      >
        {showTop && (
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
              })
            }
            aria-label="Kembali ke atas"
            className="pointer-events-auto grid size-12 place-items-center rounded-full border border-line bg-[var(--panel)] text-[var(--text-2)] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] transition-colors hover:text-[var(--text)]"
          >
            <ArrowUp aria-hidden className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Bantuan dan pintasan"
          className="pointer-events-auto grid size-12 place-items-center rounded-full border border-line bg-[var(--panel)] text-[var(--text-3)] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] transition-colors hover:text-[var(--text)]"
        >
          <CircleHelp aria-hidden className="size-5" />
        </button>
      </div>

      <MobileSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        ariaLabel="Bantuan dan pintasan"
        header={
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-semibold">Bantuan cepat</p>
              <p className="text-xs text-[var(--text-3)]">Akses dan pintasan yang sering dipakai.</p>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Tutup bantuan"
              className="grid size-12 shrink-0 place-items-center rounded-tag-sm text-[var(--text-3)] hover:text-[var(--text)]"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <section aria-labelledby="quick-links-title">
            <h2 id="quick-links-title" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
              Pintasan halaman
            </h2>
            <div className="grid gap-2">
              {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setHelpOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-tag-sm border border-line px-3 text-sm transition-colors hover:border-[var(--border-2)] hover:text-[var(--text)]"
                >
                  <Icon aria-hidden className="size-4 text-[var(--text-3)]" />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
              Pintasan keyboard
            </h2>
            <dl className="grid gap-2 text-sm">
              {[
                ["?", "Buka bantuan ini"],
                ["/", "Fokus ke kolom pencarian"],
                ["T", "Kembali ke atas"],
                ["Esc", "Tutup dialog atau lembar"],
              ].map(([key, description]) => (
                <div key={key} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                  <dt className="text-[var(--text-2)]">{description}</dt>
                  <dd className="mono rounded-tag-sm border border-line px-2 py-1 text-xs">{key}</dd>
                </div>
              ))}
            </dl>
          </section>

          <button type="button" onClick={copyPageLink} className="btn btn-ghost min-h-12 w-full justify-center text-sm">
            <Link2 aria-hidden className="size-4" /> Salin tautan halaman ini
          </button>
        </div>
      </MobileSheet>
    </>
  );
}
