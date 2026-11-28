import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { PromoForm } from "@/components/PromoForm";
import { PromoTable } from "@/components/PromoTable";

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
        <div className="mt-4">
          {promos.length === 0 ? (
            <p className="text-sm text-mute">Belum ada kode promo.</p>
          ) : (
            <PromoTable promos={promos} />
          )}
        </div>
      </section>
    </AdminShell>
  );
}
