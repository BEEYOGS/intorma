import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutCustomer } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
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
};

export default async function PortalPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/masuk");

  const orders = (await sql`
    select o.id, o.code, o.status, o.price, o.paid, o.created_at, o.service_id,
      s.name as service
    from orders o left join services s on s.id = o.service_id
    where o.customer_id = ${customer.id}
    order by o.created_at desc
    limit 50
  `) as unknown as PortalOrder[];

  const unpaid = orders.filter((o) => o.price != null && !o.paid).length;
  const done = orders.filter((o) => o.status === "selesai").length;

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
          <div className="flex items-center gap-2">
            <Link href="/order" className="btn btn-primary !h-9 text-xs">+ Pesan baru</Link>
            <form action={logoutCustomer}>
              <button className="btn btn-ghost !h-9 text-xs">Keluar</button>
            </form>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {[
            ["Total pesanan", String(orders.length)],
            ["Menunggu bayar", String(unpaid)],
            ["Selesai", String(done)],
            ["Total nilai", rupiah(orders.reduce((sum, o) => sum + Number(o.price ?? 0), 0))],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--panel)] p-4">
              <p className="text-[11px] text-[var(--text-3)]">{label}</p>
              <p className="mono mt-2 text-xl font-semibold text-[var(--text)]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <section className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="eyebrow">Riwayat</p>
              <h2 className="mt-1 text-[15px] font-medium text-[var(--text)]">Pesanan kamu</h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-mute">Belum ada pesanan yang terhubung ke akun ini.</p>
                <Link href="/order" className="btn btn-primary mt-5 !h-9 text-xs">Buat pesanan pertama</Link>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {orders.map((order) => {
                  const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
                  return (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/lacak/${order.code}`} className="mono text-sm font-medium text-[var(--text)] hover:underline">
                            {order.code}
                          </Link>
                          <StatusBadge color={STATUS_META[st].color} label={STATUS_META[st].label} />
                        </div>
                        <p className="mt-1 text-[13px] text-mute">
                          {order.service ?? "Layanan"} · {tanggal(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="mono text-sm font-medium text-[var(--text)]">
                            {order.price != null ? rupiah(Number(order.price)) : "—"}
                          </p>
                          <p className="text-[11px] text-mute">{order.paid ? "Lunas" : order.price != null ? "Belum dibayar" : "Menunggu harga"}</p>
                        </div>
                        {order.service_id && (
                          <Link href={`/order?layanan=${order.service_id}`} className="btn btn-ghost !h-8 !px-3 text-xs">
                            Pesan lagi
                          </Link>
                        )}
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
