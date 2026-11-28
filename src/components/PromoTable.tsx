"use client";

import { useEffect, useMemo, useState } from "react";
import { togglePromo } from "@/app/actions";
import { CopyTextButton } from "@/components/CopyTextButton";
import { tanggal } from "@/lib/format";

type Promo = {
  id: number;
  code: string;
  type: string;
  value: string | number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | Date | null;
  created_at: string | Date;
};

type Sort = "newest" | "expires" | "used";

export function PromoTable({ promos }: { promos: Promo[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? promos.filter((p) => p.code.toLowerCase().includes(needle)) : [...promos];
    return filtered.sort((a, b) => {
      if (sort === "expires") {
        const av = a.expires_at ? new Date(a.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bv = b.expires_at ? new Date(b.expires_at).getTime() : Number.MAX_SAFE_INTEGER;
        return av - bv;
      }
      if (sort === "used") return Number(b.used_count) - Number(a.used_count);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [promos, query, sort]);

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[12rem] flex-1">
          <span className="label">Cari kode</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Misal: DISKON10"
            className="field"
          />
        </label>
        <label className="w-full sm:w-auto">
          <span className="label">Urutkan</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="field cursor-pointer"
          >
            <option value="newest">Terbaru</option>
            <option value="expires">Kedaluwarsa terdekat</option>
            <option value="used">Paling sering dipakai</option>
          </select>
        </label>
        <span className="text-xs text-mute">{rows.length} dari {promos.length} kode</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-mute">Tidak ada kode yang cocok.</p>
      ) : (
        <div className="overflow-x-auto rounded-tag-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel/60 text-xs uppercase tracking-[0.14em] text-mute">
              <tr>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-left">Nilai</th>
                <th className="px-4 py-3 text-left">Min. order</th>
                <th className="px-4 py-3 text-left">Pakai</th>
                <th className="px-4 py-3 text-left">Kedaluwarsa</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((promo) => {
                const expired =
                  hydrated && promo.expires_at ? new Date(promo.expires_at).getTime() < Date.now() : false;
                return (
                  <tr key={promo.id}>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{promo.code}</span>
                        <CopyTextButton value={promo.code} label={`Salin kode ${promo.code}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3">{promo.type === "percent" ? "Persen" : "Nominal"}</td>
                    <td className="px-4 py-3">
                      {promo.type === "percent" ? `${promo.value}%` : `Rp${Number(promo.value).toLocaleString("id-ID")}`}
                      {promo.max_discount ? ` (maks Rp${promo.max_discount.toLocaleString("id-ID")})` : ""}
                    </td>
                    <td className="px-4 py-3">Rp{Number(promo.min_order).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      {promo.used_count}
                      {promo.usage_limit ? ` / ${promo.usage_limit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {promo.expires_at ? tanggal(promo.expires_at) : "—"}
                      {expired && <span className="ml-2 text-xs font-semibold text-danger">kedaluwarsa</span>}
                    </td>
                    <td className="px-4 py-3">
                      {promo.active ? (
                        <form action={togglePromo}>
                          <input type="hidden" name="id" value={promo.id} />
                          <input type="hidden" name="active" value="" />
                          <button type="submit" className="min-h-12 rounded-tag-sm border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-accent">
                            Aktif
                          </button>
                        </form>
                      ) : (
                        <form action={togglePromo}>
                          <input type="hidden" name="id" value={promo.id} />
                          <input type="hidden" name="active" value="on" />
                          <button type="submit" className="min-h-12 rounded-tag-sm border border-line px-3 text-xs font-semibold text-mute">
                            Nonaktif
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
