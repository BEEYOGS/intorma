import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { NotaQrCard } from "@/components/NotaQrCard";
import { PrintButton } from "@/components/PrintButton";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { jam, rupiah, tanggal } from "@/lib/format";
import { notaRows, type NotaOrder, type NotaSnapshot } from "@/lib/nota";
import { getPaymentSettings } from "@/lib/settings";
import { STATUS_META, asStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nota pesanan" };

export default async function NotaPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const order = (
    await sql`
      select o.id, o.code, o.name, o.status, o.price, o.options, o.brief, o.created_at,
        o.qty, o.unit_rate, o.width_cm, o.height_cm, o.paid, o.deadline, o.deadline_at,
        coalesce(s.name, o.service_label) as service, s.unit_label as unit_label
      from orders o left join services s on s.id = o.service_id
      where o.code = ${kode.toUpperCase()}`
  )[0];
  if (!order) notFound();

  const [payment, admin] = await Promise.all([getPaymentSettings(), isAdmin()]);
  const snapshot =
    order.options && typeof order.options === "object" ? (order.options as NotaSnapshot) : null;
  const rows = notaRows(order as NotaOrder, snapshot);

  const total = order.price == null ? null : Number(order.price);
  const status = asStatus(String(order.status));
  const meta = STATUS_META[status];

  return (
    <div className="min-h-dvh bg-[var(--bg)] py-8">
      <div className="no-print wrap mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/lacak/${order.code}`} className="btn btn-ghost min-h-10 px-3 text-sm">
          <ArrowLeft aria-hidden className="size-4" /> Kembali ke lacak
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-mute">Nota {order.code}</span>
          {admin ? (
            <PrintButton />
          ) : (
            <a
              href={`/api/nota/${order.code}/pdf`}
              download
              className="btn btn-primary min-h-10 px-4 text-sm"
            >
              <Download aria-hidden className="size-4" /> Unduh nota PDF
            </a>
          )}
        </div>
      </div>

      {!admin && (
        <div className="no-print wrap mb-6">
          <NotaQrCard code={order.code} />
        </div>
      )}

      <article className="nota-paper mx-auto" aria-label={`Nota pesanan ${order.code}`}>
        <header className="bg-[#FEFEFE] px-2 pb-4 pt-1 text-center text-[#040404]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/int-dark.svg"
            alt="in.torma"
            className="mx-auto h-auto w-[160mm] max-w-full object-contain"
          />
          <p className="mt-3 text-[10px] font-light uppercase tracking-[0.35em] text-[#111]">
            Creative without idea
          </p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-[11px] font-light text-[#111]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wa.svg" alt="WhatsApp" className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">0896 1760 7952</span>
            <span aria-hidden="true">|</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ig.svg" alt="Instagram" className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">@aku.vza</span>
          </p>
        </header>

        <div className="mt-6 text-center">
          <h1 className="text-[22px] font-bold uppercase tracking-[0.24em]">Nota pesanan</h1>
          <p className="mt-1 font-mono text-xs tracking-[0.16em]">{order.code}</p>
        </div>

        <section className="mt-7">
          <p className="nota-caption">Ditujukan kepada</p>
          <p className="mt-1 text-sm font-bold">{order.name}</p>
          <p className="text-xs text-[#333]">Pesanan {order.service ?? "custom"}</p>
        </section>

        <section className="mt-6 grid gap-3 border-y border-[#c9c9c9] py-3 text-xs sm:grid-cols-4">
          <div>
            <span className="nota-caption">Tanggal</span>
            <p className="mt-0.5 font-semibold">{tanggal(order.created_at)}</p>
          </div>
          <div>
            <span className="nota-caption">Deadline</span>
            <p className="mt-0.5 font-semibold">
              {order.deadline_at
                ? jam(order.deadline_at)
                : order.deadline
                  ? tanggal(order.deadline)
                  : "Fleksibel"}
            </p>
          </div>
          <div>
            <span className="nota-caption">Status</span>
            <p className="mt-0.5 font-semibold" style={{ color: meta.printColor }}>{meta.label}</p>
          </div>
          <div className="sm:text-right">
            <span className="nota-caption">Pembayaran</span>
            <p className="mt-0.5 font-semibold">{order.paid ? "Lunas" : total == null ? "Menunggu harga" : "Belum dibayar"}</p>
          </div>
        </section>

        <table className="nota-table mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#F4F4F5]">
              <th className="w-10 border border-[#111] px-2 py-2 text-center font-bold">No</th>
              <th className="border border-[#111] px-3 py-2 text-left font-bold">Nama</th>
              <th className="w-40 border border-[#111] px-3 py-2 text-left font-bold">Jumlah</th>
              <th className="w-36 border border-[#111] px-3 py-2 text-right font-bold">Harga</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border border-[#111] px-2 py-2 text-center">{row.name ? index + 1 : ""}</td>
                <td className="border border-[#111] px-3 py-2">{row.name || "\u00a0"}</td>
                <td className="border border-[#111] px-3 py-2">{row.qty || "\u00a0"}</td>
                <td className="border border-[#111] px-3 py-2 text-right tabular-nums">{row.amount || "\u00a0"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F4F4F5] font-bold">
              <td colSpan={3} className="border border-[#111] px-3 py-2 text-right">Total:</td>
              <td className="border border-[#111] px-3 py-2 text-right tabular-nums">{total == null ? "-" : rupiah(total)}</td>
            </tr>
          </tfoot>
        </table>

        {order.brief && (
          <section className="mt-6">
            <p className="nota-caption">Ringkasan brief</p>
            <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#222]">{order.brief}</p>
          </section>
        )}

        <section className="mt-7 grid gap-8 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div>
            <p className="nota-caption">Pembayaran</p>
            {payment.enabled && payment.bankAccount ? (
              <div className="mt-2 text-xs leading-5 text-[#222]">
                {hasBankLogo(payment.bankName) && (
                  <span className="mb-2 inline-flex rounded border border-[#ddd] bg-white px-2 py-1">
                    <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                  </span>
                )}
                <p className="font-bold">
                  Transfer {payment.bankName} {payment.bankAccount}
                </p>
                {payment.bankHolder && <p>a.n. {payment.bankHolder}</p>}
                <p>Berita transfer: <span className="font-mono font-semibold">{order.code}</span></p>
                {payment.note && <p className="mt-1 text-[#444]">{payment.note}</p>}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#444]">Instruksi pembayaran dikirim lewat WhatsApp.</p>
            )}
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs text-[#444]">Hormat kami,</p>
            <div className="mt-6 text-xl text-[#111]" style={{ fontFamily: "var(--font-signature), Georgia, serif" }}>
              Yogi Dinata
            </div>
            <div className="mt-1 border-t border-[#111] pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/int-dark.svg" alt="in.torma" className="mx-auto h-4 w-auto sm:ml-auto sm:mr-0" />
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#c9c9c9] pt-3 text-[10px] uppercase tracking-[0.14em] text-[#555]">
          <span>Creative without idea</span>
          <span>{order.code}</span>
        </footer>
      </article>
    </div>
  );
}
