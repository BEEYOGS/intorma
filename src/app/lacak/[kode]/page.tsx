import { notFound } from "next/navigation";
import { Footer, Nav, StatusDot } from "@/components/Chrome";
import { sql } from "@/lib/db";
import { jam, rupiah, tanggal } from "@/lib/format";
import { STATUS_META, isStatus, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status pesanan" };

export default async function TrackPage({
  params, searchParams,
}: { params: Promise<{ kode: string }>; searchParams: Promise<{ baru?: string }> }) {
  const [{ kode }, { baru }] = await Promise.all([params, searchParams]);
  const order = (await sql`
    select o.id, o.code, o.name, o.status, o.price, o.note, o.deadline, o.created_at, s.name as service
    from orders o left join services s on s.id = o.service_id where o.code = ${kode.toUpperCase()}`)[0];
  if (!order) notFound();
  const events = await sql`select status, note, created_at from order_events where order_id = ${order.id} order by created_at desc`;
  const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
  const meta = STATUS_META[st];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        {baru && (
          <p className="mb-8 rounded-tag-sm border border-white px-4 py-3">
            Pesanan terkirim. Simpan kode di bawah, kami juga kirim salinannya ke WhatsApp kamu.
          </p>
        )}
        <p className="text-soft">{order.service}</p>
        <h1 className="mt-1 text-5xl font-bold leading-none tracking-tightest sm:text-7xl">{order.code}</h1>

        <div className="mt-10 rounded-tag border border-line p-6">
          <p className="text-3xl font-bold tracking-tight"><StatusDot color={meta.color} label={meta.label} /></p>
          <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
            <div><dt className="text-mute">Atas nama</dt><dd className="mt-1 text-base">{order.name}</dd></div>
            <div><dt className="text-mute">Harga</dt><dd className="mt-1 text-base">{order.price ? rupiah(order.price) : "Belum ditentukan"}</dd></div>
            <div><dt className="text-mute">Target selesai</dt><dd className="mt-1 text-base">{order.deadline ? tanggal(order.deadline) : "Fleksibel"}</dd></div>
          </dl>
          {order.note && <p className="mt-6 border-t border-line pt-4 text-soft">{order.note}</p>}
        </div>

        <h2 className="mb-4 mt-12 text-xl font-bold tracking-tight">Riwayat</h2>
        <ol className="border-l border-line">
          {events.map((e, i) => {
            const m = STATUS_META[(isStatus(e.status) ? e.status : "menunggu") as Status];
            return (
              <li key={i} className="relative pb-6 pl-6 last:pb-0">
                <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rounded-full" style={{ background: m.color }} />
                <p className="font-bold">{m.label}</p>
                {e.note && <p className="text-soft">{e.note}</p>}
                <p className="text-sm text-mute">{jam(e.created_at)}</p>
              </li>
            );
          })}
        </ol>
      </main>
      <Footer />
    </>
  );
}
