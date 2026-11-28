"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle, UsersRound } from "lucide-react";
import { normalizeWA, rupiah, tanggal } from "@/lib/format";
import { STATUS_META, isStatus } from "@/lib/status";

export type CustomerRow = {
  wa: string;
  name: string;
  orders: number;
  paid_orders: number;
  spent: number;
  due: number;
  last_at: string;
  first_at: string;
};

export type CustomerHistoryRow = {
  wa: string;
  code: string;
  status: string;
  price: number | null;
  paid: boolean;
  created_at: string;
  service: string | null;
};

type Sort = "last" | "spent" | "due" | "orders";

export function CustomerList({
  customers,
  history,
}: {
  customers: CustomerRow[];
  history: Record<string, CustomerHistoryRow[]>;
}) {
  const [sort, setSort] = useState<Sort>("last");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);

  const rows = useMemo(() => {
    const out = customers.filter((customer) => {
      if (repeatOnly && Number(customer.orders) <= 1) return false;
      if (dueOnly && Number(customer.due) <= 0) return false;
      return true;
    });
    return out.sort((a, b) => {
      if (sort === "spent") return Number(b.spent) - Number(a.spent);
      if (sort === "due") return Number(b.due) - Number(a.due);
      if (sort === "orders") return Number(b.orders) - Number(a.orders);
      return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
    });
  }, [customers, sort, repeatOnly, dueOnly]);

  return (
    <>
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="w-full sm:w-auto">
          <span className="label">Urutkan</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="field cursor-pointer">
            <option value="last">Terakhir order</option>
            <option value="spent">Omzet terbesar</option>
            <option value="due">Piutang terbesar</option>
            <option value="orders">Paling sering order</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setRepeatOnly((value) => !value)}
          aria-pressed={repeatOnly}
          className={`inline-flex min-h-12 items-center rounded-tag-sm border px-3 text-xs font-semibold transition-colors ${
            repeatOnly ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-mute hover:text-[var(--text)]"
          }`}
        >
          Repeat only
        </button>
        <button
          type="button"
          onClick={() => setDueOnly((value) => !value)}
          aria-pressed={dueOnly}
          className={`inline-flex min-h-12 items-center rounded-tag-sm border px-3 text-xs font-semibold transition-colors ${
            dueOnly ? "border-danger/35 bg-danger/[0.06] text-danger" : "border-line text-mute hover:text-[var(--text)]"
          }`}
        >
          Ada piutang
        </button>
        <span className="text-xs text-mute">{rows.length} dari {customers.length} pelanggan</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-mute">Tidak ada pelanggan yang cocok dengan filter ini.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((c, index) => {
            const wa = normalizeWA(String(c.wa));
            const items = history[String(c.wa)] ?? [];
            const orders = Number(c.orders ?? 0);
            const spent = Number(c.spent ?? 0);
            const due = Number(c.due ?? 0);
            return (
              <li key={`${c.wa}-${index}`} className="rounded-tag-lg border border-line bg-panel/40">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-white/[0.02]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-tag-sm border border-line bg-white/[0.03] text-[var(--text-2)]">
                      <UsersRound aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name || "Tanpa nama"}</span>
                      <span className="mono block text-xs text-mute">{c.wa}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-tag-sm border border-line px-2.5 py-1 text-mute">{orders} pesanan</span>
                      {spent > 0 && (
                        <span className="rounded-tag-sm border border-line px-2.5 py-1 tabular-nums">{rupiah(spent)}</span>
                      )}
                      {due > 0 && (
                        <span className="rounded-tag-sm border border-danger/30 bg-danger/[0.05] px-2.5 py-1 font-semibold tabular-nums text-danger">
                          Piutang {rupiah(due)}
                        </span>
                      )}
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/30 transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="grid gap-5 border-t border-line px-4 pb-5 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                    <div>
                      <p className="eyebrow">Riwayat pesanan</p>
                      {items.length === 0 ? (
                        <p className="mt-2 text-sm text-mute">Riwayat tidak tersedia.</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-line">
                          {items.map((o) => {
                            const st = isStatus(o.status) ? o.status : "menunggu";
                            return (
                              <li key={o.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                                <span aria-hidden className="status-dot shrink-0" style={{ background: STATUS_META[st].color }} />
                                <Link
                                  href={`/admin?open=${encodeURIComponent(o.code)}`}
                                  className="mono font-semibold underline decoration-line underline-offset-4 hover:decoration-ink"
                                >
                                  {o.code}
                                </Link>
                                <span className="min-w-0 flex-1 truncate text-mute">{o.service ?? "—"}</span>
                                <span className="text-xs text-mute">{tanggal(o.created_at)}</span>
                                <span className="tabular-nums">{o.price == null ? "—" : rupiah(Number(o.price))}</span>
                                <span className="text-xs text-mute">{o.paid ? "Lunas" : "Belum bayar"}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-mute">
                        Pelanggan sejak {tanggal(c.first_at)} · terakhir {tanggal(c.last_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:w-44">
                      {wa ? (
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn btn-wa min-h-10 justify-center px-4 text-sm">
                          <MessageCircle aria-hidden className="size-4" /> Chat WhatsApp
                        </a>
                      ) : (
                        <span className="btn btn-ghost min-h-10 cursor-not-allowed justify-center px-4 text-sm opacity-50">
                          Nomor tidak tersedia
                        </span>
                      )}
                      <Link href={`/admin?q=${encodeURIComponent(String(c.wa))}`} className="btn btn-outline min-h-10 justify-center px-4 text-sm">
                        Lihat di pesanan
                      </Link>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
