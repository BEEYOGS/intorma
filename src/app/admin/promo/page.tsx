import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { tanggal } from "@/lib/format";
import { Tag } from "lucide-react";
import { togglePromo } from "@/app/actions";
import { PromoForm } from "@/components/PromoForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo", robots: { index: false } };

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

export default async function PromoPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const promos = (await sql`
    select * from promo_codes order by created_at desc limit 100
  `) as unknown as Promo[];

  return (
    <AdminShell active="promo">
      <div>
        <p className="eyebrow">Promo</p>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Kode promo</h1>
        <p className="mt-2 text-sm text-mute">Buat dan kelola diskon untuk checkout.</p>
      </div>

      <section className="mt-8 rounded-tag-lg border border-line bg-panel/40 p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Buat kode promo</h2>
        <PromoForm />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Daftar kode ({promos.length})</h2>
        {promos.length === 0 ? (
          <p className="mt-3 text-sm text-mute">Belum ada kode promo.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-tag-lg border border-line">
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
                {promos.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{promo.code}</td>
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
                    <td className="px-4 py-3">{promo.expires_at ? tanggal(promo.expires_at) : "—"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
