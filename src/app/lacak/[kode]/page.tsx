import Link from "next/link";
import { notFound } from "next/navigation";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { Footer, Nav, StatusBadge } from "@/components/Chrome";
import { CopyButton } from "@/components/CopyButton";
import { sql } from "@/lib/db";
import { jam, rupiah, tanggal } from "@/lib/format";
import { getPaymentSettings } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";
import { waLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status pesanan" };

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string }>;
}) {
  const [{ kode }, { baru }] = await Promise.all([params, searchParams]);
  const order = (
    await sql`
      select o.id, o.code, o.name, o.status, o.price, o.note, o.paid, o.deadline, o.brief,
        o.created_at, s.name as service
      from orders o left join services s on s.id = o.service_id
      where o.code = ${kode.toUpperCase()}`
  )[0];
  if (!order) notFound();

  const [events, payment] = await Promise.all([
    sql`select status, note, created_at from order_events where order_id = ${order.id} order by created_at desc`,
    getPaymentSettings(),
  ]);

  const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
  const meta = STATUS_META[st];

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line">
          <div className="wrap pb-10 pt-9 sm:pb-12 sm:pt-12">
            {baru && (
              <div className="on-dark mb-9 rounded-tag-lg bg-ink p-6 text-paper sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/60">Pesanan diterima</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight">Simpan kode pesanan kamu.</p>
                    <p className="mt-1 text-sm text-paper/60">Salinannya juga dikirim ke WhatsApp.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton
                      value={order.code}
                      label="Salin kode"
                      className="!border-paper/20 !bg-paper/10 !text-paper hover:!border-paper hover:!text-paper"
                    />
                    <a href={waLink(`status ${order.code}`)} target="_blank" rel="noreferrer" className="btn-on-dark min-h-9 px-4 text-sm">
                      Buka WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="eyebrow">{order.service ?? "Pesanan"}</p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{order.code}</h1>
                  <StatusBadge color={meta.color} label={meta.label} />
                </div>
                <p className="mt-2 text-sm text-mute">
                  Dibuat {tanggal(order.created_at)} · atas nama {order.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={order.code} label="Salin kode" />
                <Link href="/lacak" className="btn-ghost min-h-9 px-3 text-sm">
                  Lacak kode lain
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="wrap grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
          <div>
            <section aria-labelledby="status-sekarang" className="rounded-tag-lg border border-line bg-panel/60 p-6 sm:p-7">
              <p className="eyebrow">Status sekarang</p>
              <div className="mt-4 flex items-start gap-3">
                <span aria-hidden className="mt-2 size-3 shrink-0 rounded-full" style={{ background: meta.color }} />
                <div>
                  <h2 id="status-sekarang" className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.label}</h2>
                  {order.note && <p className="mt-3 max-w-xl text-sm leading-6 text-ink/65">{order.note}</p>}
                </div>
              </div>
            </section>

            <section aria-labelledby="riwayat" className="mt-9">
              <h2 id="riwayat" className="text-lg font-semibold tracking-tight">Riwayat</h2>
              <ol className="mt-4 border-l border-line">
                {events.map((e, i) => {
                  const m = STATUS_META[(isStatus(e.status) ? e.status : "menunggu") as Status];
                  return (
                    <li key={i} className="relative pb-6 pl-6 last:pb-0">
                      <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rounded-full" style={{ background: m.color }} />
                      <p className="text-sm font-semibold">{m.label}</p>
                      {e.note && <p className="mt-0.5 text-sm leading-6 text-ink/60">{e.note}</p>}
                      <p className="mt-1 text-xs text-mute">{jam(e.created_at)}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-24">
            {order.price ? (
              <section aria-label="Pembayaran" className="rounded-tag-lg border border-line bg-panel/60 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Pembayaran</p>
                  <span className={`tag ${order.paid ? "!border-ink !bg-ink !text-paper" : ""}`}>
                    <span aria-hidden className="status-dot" style={{ background: order.paid ? "#3ddc84" : "#f5b301" }} />
                    {order.paid ? "Lunas" : "Belum dibayar"}
                  </span>
                </div>
                <p className="mt-5 text-sm text-mute">Total</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{rupiah(order.price)}</p>

                {order.paid ? (
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-mute">
                    Terima kasih, pembayaran sudah dikonfirmasi admin.
                  </p>
                ) : payment.enabled && payment.bankAccount ? (
                  <>
                    <div className="mt-5 rounded-tag-sm bg-sand/70 p-4">
                      {hasBankLogo(payment.bankName) && (
                        <span className="mb-3 inline-flex rounded-[0.5rem] border border-line bg-ink px-2.5 py-1.5">
                          <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                        </span>
                      )}
                      <p className="text-sm font-semibold">
                        Transfer {payment.bankName} {payment.bankAccount}
                      </p>
                      {payment.bankHolder && <p className="mt-0.5 text-[13px] text-ink/60">a.n. {payment.bankHolder}</p>}
                      <CopyButton value={payment.bankAccount} label="Salin nomor rekening" className="mt-3" />
                      {payment.note && <p className="mt-3 border-t border-ink/10 pt-3 text-xs leading-5 text-ink/55">{payment.note}</p>}
                    </div>
                    <a
                      href={waLink(`Halo in.torma, saya mau konfirmasi transfer untuk pesanan ${order.code}.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary mt-4 min-h-11 w-full px-4 text-sm"
                    >
                      Konfirmasi transfer <span aria-hidden="true">→</span>
                    </a>
                    <p className="mt-2 text-xs leading-5 text-mute">Sertakan kode {order.code} di pesan supaya cepat dicek.</p>
                  </>
                ) : (
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-mute">
                    Instruksi transfer dikirim lewat WhatsApp. Hubungi kami kalau belum menerimanya.
                  </p>
                )}
              </section>
            ) : (
              <section aria-label="Pembayaran" className="rounded-tag-lg border border-dashed border-line p-5 sm:p-6">
                <p className="eyebrow">Pembayaran</p>
                <p className="mt-3 font-semibold">Menunggu harga dari admin</p>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Setelah brief dibaca, kami kabari total dan instruksi transfer lewat WhatsApp.
                </p>
              </section>
            )}

            <section aria-label="Detail pesanan" className="rounded-tag-lg border border-line p-5 sm:p-6">
              <p className="eyebrow">Detail</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Layanan</dt>
                  <dd className="text-right font-medium">{order.service ?? "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Atas nama</dt>
                  <dd className="text-right font-medium">{order.name}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Target selesai</dt>
                  <dd className="text-right font-medium">{order.deadline ? tanggal(order.deadline) : "Fleksibel"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Dibuat</dt>
                  <dd className="text-right font-medium">{tanggal(order.created_at)}</dd>
                </div>
              </dl>
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold">Lihat brief asli</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/60">{order.brief}</p>
              </details>
            </section>

            <p className="text-sm leading-6 text-mute">
              Ada yang ingin diubah?{" "}
              <a
                href={waLink(`Halo in.torma, saya mau tanya soal pesanan ${order.code}.`)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
              >
                Chat WhatsApp
              </a>
              .
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
