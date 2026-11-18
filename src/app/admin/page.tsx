import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogout, updateOrder } from "@/app/actions";
import { StatusDot } from "@/components/Chrome";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { STATUSES, STATUS_META, isStatus, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function Admin({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { s } = await searchParams;
  const filter = s && isStatus(s) ? s : null;

  const [orders, counts] = await Promise.all([
    filter
      ? sql`select o.*, v.name as service from orders o left join services v on v.id = o.service_id where o.status = ${filter} order by o.created_at desc limit 100`
      : sql`select o.*, v.name as service from orders o left join services v on v.id = o.service_id order by o.created_at desc limit 100`,
    sql`select status, count(*)::int as n from orders group by status`,
  ]);
  const count = (st: string) => counts.find((c) => c.status === st)?.n ?? 0;
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/int.svg" alt="in.tarma" className="h-7 w-auto" /></Link>
        <form action={adminLogout}><button className="text-sm text-soft hover:text-white">Keluar</button></form>
      </div>

      <h1 className="mt-10 text-5xl font-bold leading-none tracking-tightest">Pesanan</h1>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Filter status">
        <Link href="/admin" className={`rounded-full border px-4 py-2 ${!filter ? "border-white bg-white text-black" : "border-line text-soft hover:border-white"}`}>Semua ({total})</Link>
        {STATUSES.map((st) => (
          <Link key={st} href={`/admin?s=${st}`} className={`rounded-full border px-4 py-2 ${filter === st ? "border-white bg-white text-black" : "border-line text-soft hover:border-white"}`}>
            <StatusDot color={STATUS_META[st].color} label={`${STATUS_META[st].label} (${count(st)})`} />
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-16 text-soft">Belum ada pesanan{filter ? " dengan status ini" : ""}. Bagikan link /order ke calon klien.</p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {orders.map((o) => {
            const st = (isStatus(o.status) ? o.status : "menunggu") as Status;
            return (
              <li key={o.id} className="border-b border-line">
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-x-6 gap-y-1 px-2 py-5 hover:bg-panel sm:grid-cols-[8rem_1fr_1fr_11rem_6rem] sm:items-center">
                    <span className="font-bold tracking-wider">{o.code}</span>
                    <span>{o.name}</span>
                    <span className="text-soft">{o.service}</span>
                    <span><StatusDot color={STATUS_META[st].color} label={STATUS_META[st].label} /></span>
                    <span className="text-sm text-mute sm:text-right">{tanggal(o.created_at)}</span>
                  </summary>

                  <div className="grid gap-8 px-2 pb-8 pt-2 lg:grid-cols-2">
                    <div className="space-y-4 text-soft">
                      <p className="whitespace-pre-wrap text-white">{o.brief}</p>
                      <p className="text-sm">
                        Deadline: {o.deadline ? tanggal(o.deadline) : "fleksibel"}
                        {o.ref_link && <> · <a className="underline" href={o.ref_link} target="_blank" rel="noreferrer">Referensi</a></>}
                      </p>
                      <a className="btn-line !py-2 text-sm" href={`https://wa.me/${o.wa}`} target="_blank" rel="noreferrer">Buka chat {o.wa}</a>
                    </div>

                    <form action={updateOrder} className="space-y-4 rounded-tag border border-line p-5">
                      <input type="hidden" name="id" value={o.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-sm text-soft">Status</span>
                          <select name="status" defaultValue={o.status} className="field">
                            {STATUSES.map((x) => <option key={x} value={x} className="bg-black">{STATUS_META[x].label}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-sm text-soft">Harga (Rp)</span>
                          <input name="price" inputMode="numeric" defaultValue={o.price ?? ""} placeholder={rupiah(0).slice(2)} className="field" />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-2 block text-sm text-soft">Catatan untuk klien</span>
                        <textarea name="note" rows={2} defaultValue={o.note ?? ""} className="field resize-y" />
                      </label>
                      <label className="flex items-center gap-3 text-sm text-soft">
                        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-white" />
                        Kabari klien lewat WhatsApp
                      </label>
                      <button className="btn-solid">Simpan perubahan</button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
