import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutCustomer } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { ReorderButton } from "@/components/ReorderButton";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/Chrome";
import { getCustomer } from "@/lib/customer-auth";
import { sql } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { STATUS_META, isStatus, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portal klien" };

type PortalOrder = {
  id: number;
  code: string;
  status: string;
  price: number | null;
  paid: boolean;
  created_at: string | Date;
  service_id: string | null;
  service: string | null;
  qty: number | null;
  width_cm: number | null;
  height_cm: number | null;
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const customer = await getCustomer();
  if (!customer) redirect("/masuk");

  const orders = (await sql`
    select o.id, o.code, o.status, o.price, o.paid, o.created_at, o.service_id,
      o.qty, o.width_cm, o.height_cm,
      coalesce(s.name, o.service_label) as service
    from orders o left join services s on s.id = o.service_id
    where o.customer_id = ${customer.id}
    order by o.created_at desc
    limit 50
  `) as unknown as PortalOrder[];

  const unpaid = orders.filter((o) => o.price != null && !o.paid).length;
  const done = orders.filter((o) => o.status === "selesai").length;

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      !status ||
      status === "all" ||
      (status === "unpaid" && order.price != null && !order.paid) ||
      (status === "done" && order.status === "selesai") ||
      (status === "pending" && order.status === "menunggu");
    const matchQuery =
      !q ||
      `${order.code} ${order.service ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
    return matchStatus && matchQuery;
  });

  return (
    <div className="animate-in">
      <TopBar />
      <div className="wrap py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-1">Portal klien</p>
            <h1 className="display text-2xl sm:text-3xl">Halo, {customer.name.split(" ")[0]}.</h1>
            <p className="mt-1 text-sm text-mute">Pantau dan kelola pesananmu dari sini.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/portal/files" className="btn btn-ghost min-h-12 text-xs sm:min-h-10">File saya</Link>
            <Link href="/order" className="btn btn-primary min-h-12 text-xs sm:min-h-10">+ Pesan baru</Link>
            <form action={logoutCustomer}>
              <button className="btn btn-ghost min-h-12 text-xs sm:min-h-10">Keluar</button>
            </form>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-sharp)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {[
            ["Total pesanan", String(orders.length)],
            ["Menunggu bayar", String(unpaid)],
            ["Selesai", String(done)],
            ["Total nilai", rupiah(orders.reduce((sum, o) => sum + Number(o.price ?? 0), 0))],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--panel)] p-4">
              <p className="text-xs text-[var(--text-3)]">{label}</p>
              <p className="mono mt-2 text-xl font-semibold text-[var(--text)]">{value}</p>
            </div>
          ))}
        </div>

        <form method="GET" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="min-w-[12rem] flex-1">
            <span className="label">Cari pesanan</span>
            <input name="q" defaultValue={q ?? ""} placeholder="Kode atau nama layanan…" className="field" />
          </label>
          <label className="w-full sm:w-auto">
            <span className="label">Status</span>
            <select name="status" defaultValue={status ?? "all"} className="field cursor-pointer">
              <option value="all">Semua</option>
              <option value="unpaid">Belum dibayar</option>
              <option value="done">Selesai</option>
              <option value="pending">Menunggu</option>
            </select>
          </label>
          <button type="submit" className="btn btn-ghost min-h-10 px-4 text-sm">Filter</button>
          {(q || (status && status !== "all")) && (
            <a href="/portal" className="btn btn-ghost min-h-10 px-4 text-sm">Reset</a>
          )}
        </form>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <section className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="eyebrow">Riwayat</p>
              <h2 className="mt-1 text-[15px] font-medium text-[var(--text)]">Pesanan kamu</h2>
            </div>
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                {orders.length === 0 ? (
                  <>
                    <p className="text-sm text-mute">Belum ada pesanan yang terhubung ke akun ini.</p>
                    <Link href="/order" className="btn btn-primary mt-5 !h-10 text-xs">Buat pesanan pertama</Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-mute">Tidak ada pesanan yang cocok dengan filter.</p>
                    <a href="/portal" className="btn btn-ghost mt-5 !h-10 text-xs">Reset filter</a>
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {filteredOrders.map((order) => {
                  const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
                  return (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/lacak/${order.code}`} className="mono text-sm font-medium text-[var(--text)] hover:underline">
                            {order.code}
                          </Link>
                          <StatusBadge color={STATUS_META[st].color} label={STATUS_META[st].label} status={st} compact />
                        </div>
                        <p className="mt-1 text-[13px] text-mute">
                          {order.service ?? "Layanan"} · {tanggal(order.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-right">
                          <p className="mono text-sm font-medium text-[var(--text)]">
                            {order.price != null ? rupiah(Number(order.price)) : "—"}
                          </p>
                          <p className="text-xs text-mute">{order.paid ? "Lunas" : order.price != null ? "Belum dibayar" : "Menunggu harga"}</p>
                        </div>
                        {order.price != null && !order.paid && (
                          <Link href={`/bayar/${order.code}`} className="btn btn-primary !h-10 !px-3 text-xs">
                            Bayar
                          </Link>
                        )}
                        <ReorderButton serviceId={order.service_id} qty={order.qty} widthCm={order.width_cm} heightCm={order.height_cm} />
                        <Link href={`/lacak/${order.code}`} className="btn btn-ghost !h-10 !px-3 text-xs">
                          Lacak
                        </Link>
                        <a
                          href={`/api/nota/${order.code}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost !h-10 !px-3 text-xs"
                        >
                          Nota PDF
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="card p-5">
            <p className="eyebrow mb-4">Profil</p>
            <ProfileForm customer={customer} />
            <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-mute">
              Nomor WhatsApp yang tersimpan dipakai untuk mengirim kode pesanan dan kabar progres.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
