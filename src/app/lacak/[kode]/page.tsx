import Link from "next/link";
import { notFound } from "next/navigation";
import { BankLogo, hasBankLogo } from "@/components/BankLogo";
import { Footer, Nav, StatusBadge } from "@/components/Chrome";
import { CopyButton } from "@/components/CopyButton";
import { Barcode, ToneChips, CropCorners, RegMark, Reveal } from "@/components/Press";
import { WhatsAppLink } from "@/components/WhatsApp";
import { sql } from "@/lib/db";
import { jam, rupiah, tanggal } from "@/lib/format";
import { priceBreakdown } from "@/lib/pricing";
import { getPaymentSettings } from "@/lib/settings";
import { STATUS_META, isStatus, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status pesanan" };

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ baru?: string; wa?: string }>;
}) {
  const [{ kode }, { baru, wa }] = await Promise.all([params, searchParams]);
  const order = (
    await sql`
      select o.id, o.code, o.name, o.status, o.price, o.note, o.paid, o.deadline, o.brief,
        o.created_at, o.qty, o.unit_rate, s.name as service, s.unit_label as unit_label
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
  const flow: Status[] = ["menunggu", "dikerjakan", "selesai"];
  const flowIndex = flow.indexOf(st);
  const nextStep = order.price
    ? order.paid
      ? "Pembayaran sudah kami terima. Admin akan mengabari lewat WhatsApp kalau ada kabar."
      : "Transfer ke rekening di sebelah, lalu kirim konfirmasi lewat WhatsApp supaya cepat dicek."
    : "Admin sedang membaca brief. Harga dan jadwal menyusul lewat WhatsApp.";
  const breakdown = priceBreakdown(
    order.price == null ? null : Number(order.price),
    order.qty == null ? null : Number(order.qty),
    order.unit_rate == null ? null : Number(order.unit_rate),
    String(order.unit_label ?? ""),
    rupiah,
  );

  return (
    <>
      <Nav />
      <main id="konten">
        <div className="border-b border-line">
          <div className="wrap pb-10 pt-9 sm:pb-12 sm:pt-12">
            {baru && (
              <div className={`enter relative mb-10 overflow-hidden rounded-tag-lg border p-6 sm:p-7 ${wa === "0" ? "border-dashed border-silver/45 bg-silver/[0.07]" : "border-ink/35 bg-ink/[0.06]"}`}>
                <CropCorners />
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <RegMark className={`mt-1 size-5 shrink-0 ${wa === "0" ? "text-silver" : "text-ink"}`} />
                    <div>
                      <p className={`eyebrow ${wa === "0" ? "!text-silver" : "!text-ink"}`}>Pesanan diterima</p>
                      <p className="mt-2 text-xl font-semibold tracking-tight">Simpan kode pesanan kamu.</p>
                      <p className="mt-1 text-sm text-ink/60">
                        {wa === "0"
                          ? "Salinan WhatsApp belum terkirim otomatis. Pakai kode ini atau tombol Buka WhatsApp untuk menghubungi admin."
                          : "Salinannya juga dikirim ke WhatsApp. Kalau belum masuk, simpan kode di halaman ini."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={order.code} label="Salin kode" />
                    <WhatsAppLink text={`status ${order.code}`} className="btn-primary min-h-9 px-4 text-sm">
                      Buka WhatsApp
                    </WhatsAppLink>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">{order.service ?? "Pesanan"}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{order.code}</h1>
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
            <Reveal>
              <section aria-labelledby="status-sekarang" className="relative rounded-tag-lg border border-line bg-panel/70 p-6 sm:p-7">
                <CropCorners className="border-line" />
                <p className="eyebrow">Status sekarang</p>
                <div className="mt-4 flex items-start gap-4">
                  <span aria-hidden className="mt-2 size-3 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}88` }} />
                  <div>
                    <h2 id="status-sekarang" className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.label}</h2>
                    {order.note && <p className="mt-3 max-w-xl text-sm leading-6 text-ink/65">{order.note}</p>}
                  </div>
                </div>
              </section>
            </Reveal>

            {st === "batal" ? (
              <p className="mt-4 rounded-tag-sm border border-dashed border-ash/50 bg-ash/[0.08] px-4 py-3 text-sm text-mute">
                Pesanan ini dibatalkan. Kalau ini keliru, langsung chat kami lewat WhatsApp.
              </p>
            ) : st === "revisi" ? (
              <p className="mt-4 rounded-tag-sm border border-dashed border-silver/35 bg-silver/[0.06] px-4 py-3 text-sm text-ink/75">
                Pesanan sedang tahap revisi. Admin akan mengabari lewat WhatsApp begitu ada kabar.
              </p>
            ) : (
              <ol aria-label="Progres pesanan" className="mt-5 grid grid-cols-3 gap-2">
                {flow.map((s, index) => {
                  const done = index < flowIndex;
                  const current = index === flowIndex;
                  const color = STATUS_META[s].color;
                  return (
                    <li key={s} className="relative">
                      <span aria-hidden className="absolute left-0 top-[13px] h-px w-full bg-line" />
                      <span
                        className={`relative grid size-7 place-items-center rounded-tag-xs border font-mono text-[11px] font-bold ${
                          done || current ? "border-transparent text-paper" : "border-line bg-paper text-mute"
                        }`}
                        style={done || current ? { background: color } : undefined}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <span className={`mt-2 block text-xs font-semibold ${done || current ? "text-ink/80" : "text-mute"}`}>
                        {STATUS_META[s].label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <Reveal>
              <section aria-label="Langkah berikutnya" className="mt-5 flex gap-3 rounded-tag-sm border border-line bg-sand/80 px-4 py-3.5">
                <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-tag-xs bg-ink font-mono text-[11px] font-bold text-paper">→</span>
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-mute">Langkah berikutnya</p>
                  <p className="mt-1 text-sm leading-6 text-ink/70">{nextStep}</p>
                </div>
              </section>
            </Reveal>

            <Reveal>
              <section aria-labelledby="riwayat" className="mt-10">
                <h2 id="riwayat" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                  <RegMark className="size-3.5 text-silver" />
                  Riwayat
                </h2>
                <ol className="mt-5 border-l border-line">
                  {events.map((e, i) => {
                    const m = STATUS_META[(isStatus(e.status) ? e.status : "menunggu") as Status];
                    return (
                      <li key={i} className="relative pb-7 pl-6 last:pb-0">
                        <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}66` }} />
                        <p className="text-sm font-semibold">{m.label}</p>
                        {e.note && <p className="mt-0.5 text-sm leading-6 text-ink/60">{e.note}</p>}
                        <p className="mt-1 font-mono text-xs text-mute">{jam(e.created_at)}</p>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </Reveal>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-24">
            <Reveal>
              <div className="ticket p-5 shadow-ticket sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/55">Tiket pesanan</p>
                  <ToneChips className="size-2" />
                </div>
                <p className="mt-4 font-mono text-2xl font-bold tracking-tight">{order.code}</p>
                <Barcode value={order.code} height={40} className="mt-3 text-paper" />
                <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-paper/50">
                  {order.service ?? "in.torma"}
                </p>
              </div>
            </Reveal>

            {order.price ? (
              <Reveal delay={80}>
                <section aria-label="Pembayaran" className="rounded-tag-lg border border-line bg-panel/70 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow">Pembayaran</p>
                    <span className={`tag ${order.paid ? "!border-ink/60 !bg-ink/10 !text-ink" : "!border-steel/50 !bg-steel/10 !text-steel"}`}>
                      <span aria-hidden className="status-dot" style={{ background: order.paid ? "#ffffff" : "#8a8d8e" }} />
                      {order.paid ? "Lunas" : "Belum dibayar"}
                    </span>
                  </div>
                  <p className="mt-5 text-sm text-mute">Total</p>
                  <p className="font-mono text-3xl font-bold tracking-tight tabular-nums">{rupiah(order.price)}</p>
                  {breakdown && <p className="mt-1 font-mono text-xs text-mute">{breakdown}</p>}

                  {order.paid ? (
                    <p className="mt-4 border-t border-dashed border-line pt-4 text-sm leading-6 text-mute">
                      Terima kasih, pembayaran sudah dikonfirmasi admin.
                    </p>
                  ) : payment.enabled && payment.bankAccount ? (
                    <>
                      <div className="mt-5 rounded-tag-sm border border-line bg-sand/80 p-4">
                        {hasBankLogo(payment.bankName) && (
                          <span className="mb-3 inline-flex rounded-tag-sm border border-line bg-ink px-2.5 py-1.5">
                            <BankLogo bank={payment.bankName} className="h-5 w-auto" />
                          </span>
                        )}
                        <p className="font-mono text-sm font-semibold">
                          Transfer {payment.bankName} {payment.bankAccount}
                        </p>
                        {payment.bankHolder && <p className="mt-0.5 text-[13px] text-ink/60">a.n. {payment.bankHolder}</p>}
                        <CopyButton value={payment.bankAccount} label="Salin nomor rekening" className="mt-3" />
                        {payment.note && <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-ink/55">{payment.note}</p>}
                      </div>
                      <WhatsAppLink
                        text={`Halo in.torma, saya mau konfirmasi transfer untuk pesanan ${order.code}.`}
                        className="btn-primary mt-4 min-h-11 w-full px-4 text-sm"
                      >
                        Konfirmasi transfer <span aria-hidden="true">→</span>
                      </WhatsAppLink>
                      <p className="mt-2 text-xs leading-5 text-mute">Sertakan kode {order.code} di pesan supaya cepat dicek.</p>
                    </>
                  ) : (
                    <p className="mt-4 border-t border-dashed border-line pt-4 text-sm leading-6 text-mute">
                      Instruksi transfer dikirim lewat WhatsApp. Hubungi kami kalau belum menerimanya.
                    </p>
                  )}
                </section>
              </Reveal>
            ) : (
              <Reveal delay={80}>
                <section aria-label="Pembayaran" className="rounded-tag-lg border border-dashed border-line p-5 sm:p-6">
                  <p className="eyebrow">Pembayaran</p>
                  <p className="mt-3 font-semibold">Menunggu harga dari admin</p>
                  <p className="mt-1 text-sm leading-6 text-mute">
                    Setelah brief dibaca, kami kabari total dan instruksi transfer lewat WhatsApp.
                  </p>
                </section>
              </Reveal>
            )}

            <Reveal delay={140}>
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
                <details className="group mt-5 border-t border-line pt-4">
                  <summary className="cursor-pointer text-sm font-semibold transition-colors hover:text-ink">Lihat brief asli</summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/60">{order.brief}</p>
                </details>
              </section>
            </Reveal>

            <p className="text-sm leading-6 text-mute">
              Ada yang ingin diubah?{" "}
              <WhatsAppLink
                text={`Halo in.torma, saya mau tanya soal pesanan ${order.code}.`}
                className="link-accent"
              >
                Chat WhatsApp
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