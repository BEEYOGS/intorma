"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { History, X } from "lucide-react";
import { readRecentOrders, RECENT_KEY, type RecentOrder } from "@/components/RememberOrder";

function waktu(at: number) {
  const menit = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(at);
}

function simpan(items: RecentOrder[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // Abaikan kegagalan penyimpanan.
  }
}

export function RecentOrders() {
  const [items, setItems] = useState<RecentOrder[]>([]);
  const [undo, setUndo] = useState<{ items: RecentOrder[]; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sync = () => setItems(readRecentOrders());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("intorma:recent-orders", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("intorma:recent-orders", sync);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  function scheduleUndo(previous: RecentOrder[], label: string) {
    setUndo({ items: previous, label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  }

  function hapus(code: string) {
    scheduleUndo(items, code);
    const next = items.filter((item) => item.code !== code);
    simpan(next);
    setItems(next);
  }

  function bersihkan() {
    scheduleUndo(items, "semua riwayat");
    simpan([]);
    setItems([]);
  }

  function batalkan() {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    simpan(undo.items);
    setItems(undo.items);
    setUndo(null);
  }

  if (items.length === 0 && !undo) return null;

  return (
    <div className="wrap pt-8">
      {undo && (
        <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-tag-sm border border-line bg-panel/60 px-4 py-2 text-sm">
          <span className="text-mute">{undo.label} dihapus.</span>
          <button
            type="button"
            onClick={batalkan}
            className="inline-flex min-h-12 items-center font-semibold text-accent underline underline-offset-4"
          >
            Batalkan hapus
          </button>
        </div>
      )}
      {items.length > 0 && (
      <section className="card p-5" aria-label="Pesanan yang baru dilacak">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <History aria-hidden className="size-4 text-[var(--text-3)]" /> Lacak terakhir
          </p>
          <button
            type="button"
            onClick={bersihkan}
            className="inline-flex min-h-12 items-center text-xs font-medium text-mute underline underline-offset-4 hover:text-ink"
          >
            Hapus riwayat
          </button>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.code} className="flex min-w-0 items-center gap-1 rounded-tag-sm border border-line">
              <Link
                href={`/lacak/${item.code}`}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 px-3 transition-colors hover:bg-white/[0.04]"
              >
                <span className="mono shrink-0 text-xs text-ink">{item.code}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-mute">{item.label}</span>
                <span className="mono shrink-0 text-xs text-[var(--text-3)]">{waktu(item.at)}</span>
              </Link>
              <button
                type="button"
                onClick={() => hapus(item.code)}
                aria-label={`Hapus ${item.code} dari riwayat`}
                className="grid size-12 shrink-0 place-items-center rounded-tag-sm text-[var(--text-3)] transition-colors hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  );
}
