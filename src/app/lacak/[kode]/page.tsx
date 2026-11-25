import Link from "next/link";
import { notFound } from "next/navigation";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { Footer, Nav, StatusBadge } from "@/components/Chrome";
import { CopyButton } from "@/components/CopyButton";
import { NotaQrCard } from "@/components/NotaQrCard";
import { WhatsAppIcon, WhatsAppLink } from "@/components/WhatsApp";
import { PayButton } from "@/components/PayButton";
import { StatusTree } from "@/components/StatusTree";
import { LiveRefresh } from "@/components/LiveRefresh";
import { IconForStatus } from "@/components/StatusIcon";
import { ArrowLeft } from "lucide-react";
import { sql } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { priceBreakdown } from "@/lib/pricing";
import { gatewayEnabled } from "@/lib/payment";
import { getPaymentSettings } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";

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
        o.created_at, o.qty, o.unit_rate, o.width_cm, o.height_cm, o.options, o.subtotal,
        o.file_url, o.payment_status, o.payment_method,
        coalesce(s.name, o.service_label) as service, s.unit_label as unit_label
      from orders o left join services s on s.id = o.service_id
      where o.code = ${kode.toUpperCase()}`
  )[0];
  if (!order) notFound();

  type SnapshotLine = { label: string; detail?: string; amount: number };
  type SnapshotOption = { group_label: string; label: string };
  type Snapshot = {
    lines?: SnapshotLine[];
    options?: SnapshotOption[];
    area_m2?: number;
    width_cm?: number;
    height_cm?: number;
    summary?: string;
  };
  const snapshot =
    order.options && typeof order.options === "object" ? (order.options as Snapshot) : null;
  const quoteLines = snapshot?.lines ?? [];
  const selectedOptions = snapshot?.options ?? [];

  const gateway = gatewayEnabled();
  const [events, payment] = await Promise.all([
    sql`select status, note, created_at from order_events where order_id = ${order.id} order by created_at desc`.then(
      (rows) => rows as unknown as Array<{ status: string; note: string | null; created_at: string }>,
    ),
    getPaymentSettings(),
  ]);

  const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
  const meta = STATUS_META[st];
  const breakdown = priceBreakdown(
    order.price == null ? null : Number(order.price),
    order.qty == null ? null : Number(order.qty),
    order.unit_rate == null ? null : Number(order.unit_rate),
    String(order.unit_label ?? ""),
    rupiah,
  );
  const nextStep = st === "batal"
    ? "Pesanan dibatalkan. Tidak ada pembayaran yang perlu diselesaikan."
    : order.price == null
      ? "Pesanan custom ini menunggu harga dari admin. Kami kabari lewat WhatsApp."
      : order.paid
        ? "Pembayaran sudah kami terima. Pesanan masuk antrean produksi; kabar berikutnya lewat WhatsApp."
        : gateway
          ? "Bayar online lewat tombol di samping. Setelah berhasil, status otomatis berubah menjadi lunas."
          : payment.enabled && payment.bankAccount
            ? "Selesaikan transfer sesuai total, lalu kirim konfirmasi lewat WhatsApp dengan kode pesanan."
            : "Instruksi pembayaran dikirim lewat WhatsApp. Hubungi kami kalau belum menerimanya.";

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line bg-sand/40">
          <div className="wrap pb-10 pt-8 sm:pb-12 sm:pt-10">
            {baru && (
              <div className="mb-9 overflow-hidden rounded-tag-lg border border-accent/25 bg-accent/[0.07] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="eyebrow">Pesanan diterima</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight">Simpan kode pesanan kamu.</p>
                    <p className="mt-1 text-sm text-mute">
                      Salinannya juga dikirim ke WhatsApp. Gunakan kode ini untuk melacak progres.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={order.code} label="Salin kode" />
                    <WhatsAppLink
                      text={`status ${order.code}`}
                      className="btn-wa min-h-9 px-4 text-sm"
                    >
                      <WhatsAppIcon aria-hidden className="size-4" /> Buka WhatsApp
                    </WhatsAppLink>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <Link href="/lacak" className="btn-ghost min-h-9 px-3 text-xs">
                  <ArrowLeft aria-hidden className="size-3.5" /> Lacak kode lain
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{order.code}</h1>
                  <StatusBadge color={meta.color} label={meta.label} status={st} />
                  <LiveRefresh />
                </div>
                <p className="mt-2 text-sm text-mute">
                  {order.service ?? "Pesanan"} · dibuat {tanggal(order.created_at)} · atas nama {order.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={order.code} label="Salin kode" />
              </div>
            </div>
          </div>
        </div>

        <div className="wrap grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-12">
          <div>
            <section aria-labelledby="status-sekarang" className="card p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow">Status sekarang</p>
                <span className="tag" style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 35%, transparent)` }}>
                  <IconForStatus status={st} className="size-3.5" /> {meta.label}
                </span>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-2 grid size-3 shrink-0 place-items-center rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 0 4px ${meta.soft}` }}
                />
                <div>
                  <h2 id="status-sekarang" className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: meta.color }}>
                    {meta.label}
                  </h2>
                  {order.note && <p className="mt-3 max-w-xl text-sm leading-6 text-mute">{order.note}</p>}
                </div>
              </div>

              {st === "batal" && (
                <p className="mt-5 rounded-tag-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
                  Pesanan ini dibatalkan. Kalau ini keliru, langsung chat kami lewat WhatsApp.
                </p>
              )}

              <StatusTree status={st} events={events} note={order.note} />
            </section>

            <section aria-label="Langkah berikutnya" className="mt-4 flex gap-3 rounded-tag-sm border border-accent/20 bg-accent/[0.05] px-4 py-3.5">
              <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-[#04110f]">
                →
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Langkah berikutnya</p>
                <p className="mt-1 text-sm leading-6 text-ink/75">{nextStep}</p>
              </div>
            </section>

          </div>

          <aside className="grid gap-5 lg:sticky lg:top-24">
            <NotaQrCard code={order.code} />
            {order.price ? (
              <section aria-label="Pembayaran" className="card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Pembayaran</p>
                  <span className="tag !border-line !text-ink">
                    <span
                      aria-hidden
                      className="status-dot"
                      style={{ background: order.paid ? "#4fae86" : "#d8a13a" }}
                    />
                    {order.paid ? "Lunas" : "Belum dibayar"}
                  </span>
                </div>
                <p className="mt-5 text-sm text-mute">Total</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-accent">{rupiah(order.price)}</p>
                {quoteLines.length > 0 ? (
                  <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                    {quoteLines.map((line, index) => (
                      <div key={index} className="flex justify-between gap-3 text-mute">
                        <dt>
                          {line.label}
                          {line.detail && <span className="block text-[11px] text-mute/70">{line.detail}</span>}
                        </dt>
                        <dd className="shrink-0 tabular-nums">{rupiah(line.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  breakdown && <p className="mt-1 text-xs text-mute">{breakdown}</p>
                )}
                {selectedOptions.length > 0 && (
                  <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-mute">
                    {selectedOptions.map((option) => `${option.group_label}: ${option.label}`).join(" · ")}
                  </p>
                )}

                {order.paid ? (
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-mute">
                    {String(order.payment_method ?? "").startsWith("midtrans")
                      ? "Terima kasih, pembayaran online sudah terverifikasi otomatis."
                      : "Terima kasih, pembayaran sudah dikonfirmasi admin."}
                  </p>
                ) : st === "batal" ? (
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-mute">
                    Pesanan dibatalkan. Tidak perlu melakukan pembayaran.
                  </p>
                ) : (
                  <>
                    {gateway && (
                      <div className="mt-5 border-t border-line pt-4">
                        <p className="eyebrow mb-2">Bayar online</p>
                        <PayButton code={order.code} />
                        <p className="mt-2 text-xs leading-5 text-mute">
                          Setelah pembayaran berhasil, status otomatis berubah menjadi lunas.
                        </p>
                      </div>
                    )}

                    {payment.enabled && payment.bankAccount && (
                      <details className="mt-4 border-t border-line pt-4">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-mute">
                          {gateway ? "Transfer manual (opsional)" : "Transfer bank"}
                        </summary>
                        <div className="mt-3 rounded-tag-sm border border-line bg-sand/60 p-4">
                          {hasBankLogo(payment.bankName) && (
                            <span className="mb-3 inline-flex rounded-[0.5rem] border border-line bg-ink px-2.5 py-1.5">
                              <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                            </span>
                          )}
                          <p className="text-sm font-semibold">
                            Transfer {payment.bankName} {payment.bankAccount}
                          </p>
                          {payment.bankHolder && <p className="mt-0.5 text-[13px] text-mute">a.n. {payment.bankHolder}</p>}
                          <p className="mt-3 text-xs text-mute">
                            Berita transfer: <span className="font-mono font-semibold text-ink/70">{order.code}</span>
                          </p>
                          <CopyButton value={payment.bankAccount} label="Salin nomor rekening" className="mt-3" />
                          {payment.note && (
                            <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-mute">{payment.note}</p>
                          )}
                        </div>
                        <WhatsAppLink
                          text={`Halo in.torma, saya mau konfirmasi transfer untuk pesanan ${order.code}.`}
                          className="btn-wa mt-3 min-h-11 w-full px-4 text-sm"
                        >
                          <WhatsAppIcon aria-hidden className="size-4" /> Konfirmasi transfer manual
                        </WhatsAppLink>
                      </details>
                    )}

                    {!gateway && !payment.enabled && (
                      <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-mute">
                        Instruksi pembayaran dikirim lewat WhatsApp. Hubungi kami kalau belum menerimanya.
                      </p>
                    )}
                  </>
                )}
              </section>
            ) : (
              <section aria-label="Pembayaran" className="card border-dashed p-5 sm:p-6">
                <p className="eyebrow">Pembayaran</p>
                <p className="mt-3 font-semibold">Menunggu harga dari admin</p>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Setelah brief dibaca, kami kabari total dan instruksi transfer lewat WhatsApp.
                </p>
              </section>
            )}

            <section aria-label="Detail pesanan" className="card p-5 sm:p-6">
              <p className="eyebrow">Spesifikasi pesanan</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Layanan</dt>
                  <dd className="text-right font-medium">{order.service ?? "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-mute">Atas nama</dt>
                  <dd className="text-right font-medium">{order.name}</dd>
                </div>
                {order.file_url && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-mute">File cetak</dt>
                    <dd className="text-right font-medium">
                      <a href={order.file_url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:decoration-current">
                        Buka file
                      </a>
                    </dd>
                  </div>
                )}
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
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mute">{order.brief}</p>
              </details>
            </section>

            <p className="text-sm leading-6 text-mute">
              Ada yang ingin diubah?{" "}
              <WhatsAppLink
                text={`Halo in.torma, saya mau tanya soal pesanan ${order.code}.`}
                className="inline-flex items-center gap-1 font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              >
                Chat WhatsApp <WhatsAppIcon className="size-3.5" />
              </WhatsAppLink>
              .
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
